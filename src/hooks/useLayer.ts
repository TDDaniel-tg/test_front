import { useCallback } from 'react';
import { useLayersSelector, useLayersStore } from '../store/layersStore';
import { layerManager } from '../store/layerManager';
import { LayerId, LayerState } from '../store/types';

export interface UseLayerReturn {
  layer: LayerState | undefined;
  isSelected: boolean;
  toggle: () => void;
  retry: () => void;
  setOpacity: (opacity: number) => void;
  select: () => void;
}

/**
 * Granular hook for accessing and controlling an individual layer.
 * Because it subscribes specifically to `state.layers[layerId]`,
 * updates to other layers or the layerIds list will NEVER cause components
 * using this hook to re-render.
 */
export function useLayer(layerId: LayerId): UseLayerReturn {
  const store = useLayersStore();

  // Fine-grained slice subscription via Vedro
  const layer = useLayersSelector((state) => state.layers[layerId]);
  const isSelected = useLayersSelector((state) => state.selectedLayerId === layerId);

  const toggle = useCallback(() => {
    void layerManager.toggleLayer(store, layerId);
  }, [store, layerId]);

  const retry = useCallback(() => {
    void layerManager.retryLayer(store, layerId);
  }, [store, layerId]);

  const setOpacity = useCallback(
    (opacity: number) => {
      layerManager.setLayerOpacity(store, layerId, opacity);
    },
    [store, layerId]
  );

  const select = useCallback(() => {
    layerManager.setSelectedLayer(store, layerId);
  }, [store, layerId]);

  return {
    layer,
    isSelected,
    toggle,
    retry,
    setOpacity,
    select,
  };
}
