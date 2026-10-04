import { LayerData, LayerId, LayerType } from '../store/types';
import { createMockLayerData } from './mockData';

export interface FetchLayerOptions {
  layerId: LayerId;
  type: LayerType;
  signal?: AbortSignal;
  latencyMs?: number;
  forceError?: boolean;
  errorRate?: number;
}

/**
 * Mock API service simulating asynchronous fetching of cartographic tile/raster data.
 * Fully supports `AbortSignal` to guarantee deterministic cancellation of in-flight requests.
 */
export function fetchCartoLayerApi(options: FetchLayerOptions): Promise<LayerData> {
  const {
    layerId,
    type,
    signal,
    latencyMs = 750,
    forceError = false,
    errorRate = 0,
  } = options;

  return new Promise<LayerData>((resolve, reject) => {
    // 1. Check if already aborted before doing anything
    if (signal?.aborted) {
      reject(new DOMException('Fetch operation aborted by client', 'AbortError'));
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // 2. Setup abort listener
    const abortHandler = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      reject(new DOMException('Fetch operation aborted by client', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    // 3. Simulate network latency
    timeoutId = setTimeout(() => {
      // Clean up abort listener
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }

      // Check for forced error or probabilistic error
      const shouldFail = forceError || (errorRate > 0 && Math.random() < errorRate);
      if (shouldFail) {
        const errorMessages = [
          `Ошибка тайлового сервера (503 Service Unavailable) для слоя "${layerId}"`,
          `Таймаут шлюза картографии (504 Gateway Timeout) при получении растра`,
          `Ошибка сетевого сокета (ECONNRESET): сбой соединения с гео-кластером`,
        ];
        const randomMsg = errorMessages[Math.floor(Math.random() * errorMessages.length)];
        reject(new Error(randomMsg));
        return;
      }

      // Return synthetic layer payload
      const data = createMockLayerData(layerId, type);
      resolve(data);
    }, latencyMs);
  });
}
