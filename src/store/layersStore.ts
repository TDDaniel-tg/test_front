import { createVedro } from 'vedro';
import { BASE_LAYER_IDS, INITIAL_BASE_LAYERS } from '../api/mockData';
import { LayersStoreState } from './types';

export const initialLayersStoreState: LayersStoreState = {
  layers: INITIAL_BASE_LAYERS,
  layerIds: BASE_LAYER_IDS,
  selectedLayerId: 'temperature',
  networkConfig: {
    latencyMs: 750,
    forceError: false,
    errorRate: 0,
  },
  logs: [
    {
      id: 'init_1',
      timestamp: Date.now(),
      layerId: 'system',
      action: 'REQUEST_START',
      message: 'Инициализация Vedro Store: 3 базовых слоя готовы к загрузке',
      token: 0,
    },
  ],
};

/**
 * Primary Cartographic Store created via Vedro
 * Provides:
 * - LayersStoreContext: React Context
 * - LayersStoreProvider: Context Provider
 * - useLayersStore: Returns Vedro<LayersStoreState> store instance
 * - useLayersDispatch: Returns dispatch function
 * - useLayersSelector: Returns memoized selector with shallow JSON equality check
 */
export const {
  Context: LayersStoreContext,
  Provider: LayersStoreProvider,
  useStore: useLayersStore,
  useDispatch: useLayersDispatch,
  useSelector: useLayersSelector,
} = createVedro<LayersStoreState>(initialLayersStoreState);
