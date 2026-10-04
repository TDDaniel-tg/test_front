import { describe, it, expect, beforeEach } from 'vitest';
import Vedro from 'vedro';
import { initialLayersStoreState } from '../store/layersStore';
import { layerManager } from '../store/layerManager';
import { fetchCartoLayerApi } from '../api/layersApi';
import { LayersStoreState } from '../store/types';

describe('GIS Carto Layers: Vedro Store & Race Condition Protection', () => {
  let store: Vedro<LayersStoreState>;

  beforeEach(() => {
    // Fresh store instance for each test
    store = new Vedro<LayersStoreState>({
      ...initialLayersStoreState,
      networkConfig: {
        latencyMs: 50, // fast latency for unit tests
        forceError: false,
        errorRate: 0,
      },
    });
  });

  describe('1. Store State & Immutability', () => {
    it('initializes with 3 base layers (temperature, wind, insolation)', () => {
      const state = store.get();
      expect(state.layerIds).toEqual(['temperature', 'wind', 'insolation']);
      expect(state.layers['temperature'].status).toBe('idle');
      expect(state.layers['wind'].status).toBe('idle');
      expect(state.layers['insolation'].status).toBe('idle');
    });

    it('updating opacity of one layer preserves reference equality of other layers', () => {
      const stateBefore = store.get();
      const windBefore = stateBefore.layers['wind'];
      const insolationBefore = stateBefore.layers['insolation'];

      layerManager.setLayerOpacity(store, 'temperature', 0.42);

      const stateAfter = store.get();
      expect(stateAfter.layers['temperature'].opacity).toBe(0.42);

      // Crucial for Vedro rendering optimization: untouched slices must preserve referential equality!
      expect(stateAfter.layers['wind']).toBe(windBefore);
      expect(stateAfter.layers['insolation']).toBe(insolationBefore);
      expect(stateAfter.layerIds).toBe(stateBefore.layerIds);
    });
  });

  describe('2. Mock API & AbortSignal', () => {
    it('successfully fetches cartographic layer data with metadata and tiles', async () => {
      const data = await fetchCartoLayerApi({
        layerId: 'temperature',
        type: 'temperature',
        latencyMs: 20,
      });

      expect(data.id).toBe('temperature');
      expect(data.type).toBe('temperature');
      expect(data.tileCount).toBeGreaterThan(0);
      expect(data.metadata.unit).toBe('°C');
      expect(data.metadata.samplePoints.length).toBeGreaterThan(0);
    });

    it('immediately aborts when AbortSignal is triggered', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        fetchCartoLayerApi({
          layerId: 'wind',
          type: 'wind',
          signal: controller.signal,
          latencyMs: 100,
        })
      ).rejects.toThrowError();
    });

    it('throws domain error when forceError is enabled', async () => {
      await expect(
        fetchCartoLayerApi({
          layerId: 'insolation',
          type: 'insolation',
          latencyMs: 10,
          forceError: true,
        })
      ).rejects.toThrow(/503|504|ECONNRESET/);
    });
  });

  describe('3. Race Condition & Asynchronous Toggling', () => {
    it('transitions layer from idle -> loading -> success on toggle ON', async () => {
      const loadPromise = layerManager.toggleLayer(store, 'temperature');

      // Immediately after toggle ON, layer should be enabled and loading
      expect(store.get().layers['temperature'].enabled).toBe(true);
      expect(store.get().layers['temperature'].status).toBe('loading');

      await loadPromise;

      // After API resolves, layer should be success
      const finalLayer = store.get().layers['temperature'];
      expect(finalLayer.status).toBe('success');
      expect(finalLayer.data).not.toBeNull();
      expect(finalLayer.data?.metadata.unit).toBe('°C');
    });

    it('cancels pending request when user turns layer OFF while loading (Race Condition test)', async () => {
      // Step 1: User turns ON
      void layerManager.toggleLayer(store, 'temperature');
      expect(store.get().layers['temperature'].status).toBe('loading');

      // Step 2: User quickly turns OFF before fetch completes
      await layerManager.toggleLayer(store, 'temperature');

      expect(store.get().layers['temperature'].enabled).toBe(false);
      expect(store.get().layers['temperature'].status).toBe('idle');

      // Wait for original network latency to pass
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Result: Layer MUST remain idle, NOT overwritten by the aborted request
      const finalLayer = store.get().layers['temperature'];
      expect(finalLayer.enabled).toBe(false);
      expect(finalLayer.status).toBe('idle');
      expect(finalLayer.error).toBeNull();
    });

    it('handles rapid ON -> OFF -> ON toggling: only latest request commits', async () => {
      // Toggle 1: ON
      void layerManager.toggleLayer(store, 'wind');
      // Toggle 2: OFF (aborts request 1)
      void layerManager.toggleLayer(store, 'wind');
      // Toggle 3: ON (starts request 2 with fresh token)
      await layerManager.toggleLayer(store, 'wind');

      const finalLayer = store.get().layers['wind'];
      expect(finalLayer.enabled).toBe(true);
      expect(finalLayer.status).toBe('success');
      expect(finalLayer.data?.type).toBe('wind');
    });

    it('handles error state and successful retry', async () => {
      // Force error
      layerManager.updateNetworkConfig(store, { forceError: true });

      await layerManager.toggleLayer(store, 'insolation');

      const errorLayer = store.get().layers['insolation'];
      expect(errorLayer.enabled).toBe(true);
      expect(errorLayer.status).toBe('error');
      expect(errorLayer.error).toMatch(/503|504|ECONNRESET/);

      // Disable force error and Retry
      layerManager.updateNetworkConfig(store, { forceError: false });
      await layerManager.retryLayer(store, 'insolation');

      const recoveredLayer = store.get().layers['insolation'];
      expect(recoveredLayer.status).toBe('success');
      expect(recoveredLayer.error).toBeNull();
      expect(recoveredLayer.data).not.toBeNull();
    });
  });

  describe('4. Scalability from 3 to 100+ Layers', () => {
    it('switches to 100 layers and maintains O(1) state lookups', () => {
      layerManager.setScaleMode(store, 'scale100');

      const state = store.get();
      expect(state.layerIds.length).toBe(100);
      expect(state.layers['layer_50']).toBeDefined();
      expect(state.layers['layer_100']).toBeDefined();

      // Opacity update on layer 77 does not corrupt other layers
      layerManager.setLayerOpacity(store, 'layer_77', 0.35);
      expect(store.get().layers['layer_77'].opacity).toBe(0.35);
      expect(store.get().layers['layer_50'].opacity).toBe(0.8);
    });

    it('batch disable turns off all layers and clears active requests', async () => {
      layerManager.setScaleMode(store, 'scale100');

      await layerManager.batchToggleAll(store, false);

      const state = store.get();
      const anyActive = state.layerIds.some((id) => state.layers[id]?.enabled);
      expect(anyActive).toBe(false);
    });
  });
});
