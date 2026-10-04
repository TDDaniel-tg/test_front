import React, { useState, useMemo, useCallback } from 'react';
import { useLayersSelector, useLayersStore } from '../../store/layersStore';
import { layerManager } from '../../store/layerManager';
import { LayerCard } from './LayerCard';
import { useRenderTracker } from '../../hooks/useRenderTracker';
import { RenderBadge } from '../ui/RenderBadge';
import { Search, Eye, EyeOff, Layers, Sparkles } from 'lucide-react';

export const LayersList: React.FC = React.memo(() => {
  const store = useLayersStore();
  const layerIds = useLayersSelector((state) => state.layerIds);
  const layersMap = useLayersSelector((state) => state.layers);
  const { renderCount, isFlashing } = useRenderTracker();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'enabled' | 'error'>('all');

  // Compute active count
  const activeCount = useMemo(() => {
    return layerIds.filter((id) => layersMap[id]?.enabled).length;
  }, [layerIds, layersMap]);

  // Filter layer IDs based on search & status filter
  const filteredIds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return layerIds.filter((id) => {
      const layer = layersMap[id];
      if (!layer) return false;

      // Status filter
      if (filterMode === 'enabled' && !layer.enabled) return false;
      if (filterMode === 'error' && layer.status !== 'error') return false;

      // Search query
      if (!query) return true;
      return (
        layer.title.toLowerCase().includes(query) ||
        layer.subtitle.toLowerCase().includes(query) ||
        id.toLowerCase().includes(query)
      );
    });
  }, [layerIds, layersMap, searchQuery, filterMode]);

  const handleToggleAll = useCallback(
    (enable: boolean) => {
      void layerManager.batchToggleAll(store, enable);
    },
    [store]
  );

  return (
    <div className="layers-list-panel">
      {/* Panel Header */}
      <div className="layers-list-header">
        <div className="layers-list-title-wrap">
          <div className="layers-list-title-left">
            <Layers size={20} className="text-accent" />
            <h3 className="layers-list-heading">Картографические слои</h3>
            <span className="badge-count">
              {activeCount} / {layerIds.length}
            </span>
          </div>

          <div className="layers-list-render-proof">
            <span className="proof-label">List Container:</span>
            <RenderBadge count={renderCount} isFlashing={isFlashing} />
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="layers-toolbar">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Поиск по названию или ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="filter-chips">
            <button
              type="button"
              className={`filter-chip ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              Все ({layerIds.length})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterMode === 'enabled' ? 'active' : ''}`}
              onClick={() => setFilterMode('enabled')}
            >
              <Eye size={12} /> Активные ({activeCount})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterMode === 'error' ? 'active' : ''}`}
              onClick={() => setFilterMode('error')}
            >
              Ошибки
            </button>
          </div>
        </div>

        {/* Quick Batch Actions */}
        <div className="batch-actions-bar">
          <button
            type="button"
            className="btn-batch"
            onClick={() => handleToggleAll(true)}
            title="Запустить загрузку первых слоев"
          >
            <Eye size={13} /> Включить пакет
          </button>
          <button
            type="button"
            className="btn-batch btn-batch-off"
            onClick={() => handleToggleAll(false)}
            title="Мгновенно отключить все слои и отменить сетевые запросы"
          >
            <EyeOff size={13} /> Выключить все
          </button>
          {layerIds.length > 5 && (
            <span className="scale-indicator-tag">
              <Sparkles size={12} /> Стресс-тест ({layerIds.length} слоев)
            </span>
          )}
        </div>
      </div>

      {/* Layer Cards Scroll Container */}
      <div className="layers-cards-scroll">
        {filteredIds.length === 0 ? (
          <div className="empty-layers-state">
            <Layers size={36} className="empty-layers-icon" />
            <p>Слои не найдены по запросу "{searchQuery}"</p>
          </div>
        ) : (
          filteredIds.map((id) => <LayerCard key={id} layerId={id} />)
        )}
      </div>
    </div>
  );
});

LayersList.displayName = 'LayersList';
