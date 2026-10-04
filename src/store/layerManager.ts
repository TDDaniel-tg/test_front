import type Vedro from 'vedro';
import { fetchCartoLayerApi } from '../api/layersApi';
import { generateScaleLayers, INITIAL_BASE_LAYERS, BASE_LAYER_IDS } from '../api/mockData';
import { LayerId, LayersStoreState, LogEntry, NetworkConfig } from './types';

class LayerAsyncController {
  private activeControllers = new Map<LayerId, AbortController>();
  private activeTokens = new Map<LayerId, number>();

  private getNextToken(layerId: LayerId): number {
    const next = (this.activeTokens.get(layerId) ?? 0) + 1;
    this.activeTokens.set(layerId, next);
    return next;
  }

  private abortActive(layerId: LayerId, reason = 'Superseded'): void {
    const ctrl = this.activeControllers.get(layerId);
    if (ctrl) {
      ctrl.abort(reason);
      this.activeControllers.delete(layerId);
    }
  }

  private appendLog(
    state: LayersStoreState,
    layerId: LayerId,
    action: LogEntry['action'],
    message: string,
    token: number
  ): readonly LogEntry[] {
    const entry: LogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      layerId,
      action,
      message,
      token,
    };
    return [entry, ...state.logs.slice(0, 79)];
  }

  /**
   * Toggles a layer ON or OFF.
   * If toggled OFF while loading: in-flight request is cancelled instantly via AbortController,
   * status reverts to idle, preventing race conditions.
   * If toggled ON: aborts any stale requests, assigns a fresh epoch token, and starts fetch.
   */
  public async toggleLayer(store: Vedro<LayersStoreState>, layerId: LayerId): Promise<void> {
    const currentState = store.get();
    const layer = currentState.layers[layerId];
    if (!layer) return;

    if (layer.enabled) {
      // User is disabling the layer
      this.abortActive(layerId, 'Layer disabled by user');
      this.activeTokens.delete(layerId);

      store.dispatch((state: LayersStoreState) => {
        const target = state.layers[layerId];
        if (!target) return {};

        return {
          layers: {
            ...state.layers,
            [layerId]: {
              ...target,
              enabled: false,
              status: 'idle',
              error: null,
            },
          },
          logs: this.appendLog(
            state,
            layerId,
            'TOGGLE',
            `Слой "${target.title}" отключен пользователем`,
            0
          ),
        };
      });
      return;
    }

    // User is enabling the layer -> initiate load
    await this.loadLayerData(store, layerId, { isRetry: false });
  }

  /**
   * Retries fetching a layer that failed or needs reloading.
   */
  public async retryLayer(store: Vedro<LayersStoreState>, layerId: LayerId): Promise<void> {
    await this.loadLayerData(store, layerId, { isRetry: true });
  }

  /**
   * Loads cartographic data for a layer with robust race condition mitigation.
   */
  public async loadLayerData(
    store: Vedro<LayersStoreState>,
    layerId: LayerId,
    options: { isRetry: boolean }
  ): Promise<void> {
    const currentState = store.get();
    const layer = currentState.layers[layerId];
    if (!layer) return;

    // 1. Abort existing in-flight request for this layer
    this.abortActive(layerId, 'Re-requested or retried');

    // 2. Issue a unique generation token for this fetch cycle
    const currentToken = this.getNextToken(layerId);

    // 3. Create fresh AbortController
    const abortController = new AbortController();
    this.activeControllers.set(layerId, abortController);

    const netConfig = currentState.networkConfig;

    // 4. Update store to loading status
    store.dispatch((state: LayersStoreState) => {
      const target = state.layers[layerId];
      if (!target) return {};

      const msg = options.isRetry
        ? `[Токен #${currentToken}] Повторный запрос данных (Retry)`
        : `[Токен #${currentToken}] Запрос тайлов слоя (API mock, задержка ${netConfig.latencyMs}мс)`;

      return {
        layers: {
          ...state.layers,
          [layerId]: {
            ...target,
            enabled: true,
            status: 'loading',
            error: null,
          },
        },
        logs: this.appendLog(state, layerId, 'REQUEST_START', msg, currentToken),
      };
    });

    try {
      // 5. Fire async API call with AbortSignal
      const data = await fetchCartoLayerApi({
        layerId,
        type: layer.type,
        signal: abortController.signal,
        latencyMs: netConfig.latencyMs,
        forceError: netConfig.forceError,
        errorRate: netConfig.errorRate,
      });

      // 6. RACE CONDITION CHECK #1: Token validation
      // If active token has changed, this response is obsolete
      if (this.activeTokens.get(layerId) !== currentToken) {
        return;
      }

      // 7. RACE CONDITION CHECK #2: Layer enabled state in store
      // If user switched layer OFF during the fetch, discard result
      const freshState = store.get();
      const freshLayer = freshState.layers[layerId];
      if (!freshLayer || !freshLayer.enabled) {
        return;
      }

      // Clean up controller
      this.activeControllers.delete(layerId);

      // 8. Commit successful data to store
      store.dispatch((state: LayersStoreState) => {
        const target = state.layers[layerId];
        if (!target) return {};

        return {
          layers: {
            ...state.layers,
            [layerId]: {
              ...target,
              status: 'success',
              data,
              error: null,
              lastUpdated: Date.now(),
            },
          },
          logs: this.appendLog(
            state,
            layerId,
            'REQUEST_SUCCESS',
            `[Токен #${currentToken}] Успех: загружено ${data.tileCount} тайлов (${data.resolution})`,
            currentToken
          ),
        };
      });
    } catch (err: unknown) {
      // 9. Cancellation detection
      const isAborted =
        abortController.signal.aborted ||
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError');

      if (isAborted) {
        // Intentional cancellation - do NOT set error on layer
        store.dispatch((state: LayersStoreState) => ({
          logs: this.appendLog(
            state,
            layerId,
            'REQUEST_ABORTED',
            `[Токен #${currentToken}] Запрос прерван (AbortSignal / быстрая отмена)`,
            currentToken
          ),
        }));
        return;
      }

      // Check token validity
      if (this.activeTokens.get(layerId) !== currentToken) {
        return;
      }

      const freshLayer = store.get().layers[layerId];
      if (!freshLayer || !freshLayer.enabled) {
        return;
      }

      this.activeControllers.delete(layerId);
      const errorMessage =
        err instanceof Error ? err.message : 'Сбой получения данных картографического слоя';

      // 10. Commit error status to store
      store.dispatch((state: LayersStoreState) => {
        const target = state.layers[layerId];
        if (!target) return {};

        return {
          layers: {
            ...state.layers,
            [layerId]: {
              ...target,
              status: 'error',
              error: errorMessage,
            },
          },
          logs: this.appendLog(
            state,
            layerId,
            'REQUEST_ERROR',
            `[Токен #${currentToken}] Ошибка: ${errorMessage}`,
            currentToken
          ),
        };
      });
    }
  }

  /**
   * Sets opacity for a layer without triggering renders of other layers.
   */
  public setLayerOpacity(
    store: Vedro<LayersStoreState>,
    layerId: LayerId,
    opacity: number
  ): void {
    const clamped = Math.max(0, Math.min(1, Math.round(opacity * 100) / 100));

    store.dispatch((state: LayersStoreState) => {
      const target = state.layers[layerId];
      if (!target || target.opacity === clamped) return {};

      return {
        layers: {
          ...state.layers,
          [layerId]: {
            ...target,
            opacity: clamped,
          },
        },
      };
    });
  }

  /**
   * Selects a layer for detailed metadata view on the map / inspector.
   */
  public setSelectedLayer(store: Vedro<LayersStoreState>, layerId: LayerId | null): void {
    store.dispatch((state: LayersStoreState) => {
      if (state.selectedLayerId === layerId) return {};
      return { selectedLayerId: layerId };
    });
  }

  /**
   * Updates network simulation parameters (latency, error forcing, error rate).
   */
  public updateNetworkConfig(
    store: Vedro<LayersStoreState>,
    patch: Partial<NetworkConfig>
  ): void {
    store.dispatch((state: LayersStoreState) => ({
      networkConfig: {
        ...state.networkConfig,
        ...patch,
      },
    }));
  }

  /**
   * Switches store between base layers (3 layers) and scalable stress test (100+ layers).
   */
  public setScaleMode(
    store: Vedro<LayersStoreState>,
    mode: 'base' | 'scale100'
  ): void {
    // Abort all active requests first
    for (const [id] of this.activeControllers) {
      this.abortActive(id, 'Mode switch');
    }
    this.activeTokens.clear();

    if (mode === 'base') {
      store.dispatch((state: LayersStoreState) => ({
        layers: INITIAL_BASE_LAYERS,
        layerIds: BASE_LAYER_IDS,
        selectedLayerId: 'temperature',
        logs: this.appendLog(
          state,
          'system',
          'TOGGLE',
          'Переключен режим: 3 базовых слоя (Температура, Ветер, Инсоляция)',
          0
        ),
      }));
    } else {
      const { layers, layerIds } = generateScaleLayers(100);
      store.dispatch((state: LayersStoreState) => ({
        layers,
        layerIds,
        selectedLayerId: 'temperature',
        logs: this.appendLog(
          state,
          'system',
          'TOGGLE',
          'Переключен режим масштабирования: Сгенерировано 100 слоёв для стресс-теста',
          0
        ),
      }));
    }
  }

  /**
   * Batch toggle all layers (for testing high load and render efficiency).
   */
  public async batchToggleAll(
    store: Vedro<LayersStoreState>,
    enable: boolean
  ): Promise<void> {
    const state = store.get();
    const ids = state.layerIds;

    if (!enable) {
      // Abort all
      for (const id of ids) {
        this.abortActive(id, 'Batch disable');
        this.activeTokens.delete(id);
      }

      const updatedLayers = { ...state.layers };
      for (const id of ids) {
        const lyr = updatedLayers[id];
        if (lyr) {
          updatedLayers[id] = { ...lyr, enabled: false, status: 'idle', error: null };
        }
      }

      store.dispatch((s: LayersStoreState) => ({
        layers: updatedLayers,
        logs: this.appendLog(s, 'system', 'TOGGLE', `Массовое отключение: выключено ${ids.length} слоев`, 0),
      }));
      return;
    }

    // Enable first 15 layers
    const targetIds = ids.slice(0, 15);
    for (const id of targetIds) {
      void this.loadLayerData(store, id, { isRetry: false });
    }
  }

  /**
   * Clears the event log.
   */
  public clearLogs(store: Vedro<LayersStoreState>): void {
    store.dispatch({ logs: [] });
  }
}

export const layerManager = new LayerAsyncController();
