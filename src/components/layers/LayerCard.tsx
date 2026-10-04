import React, { useId } from 'react';
import { LayerId, LayerType } from '../../store/types';
import { useLayer } from '../../hooks/useLayer';
import { useRenderTracker } from '../../hooks/useRenderTracker';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { Slider } from '../ui/Slider';
import { RenderBadge } from '../ui/RenderBadge';
import { LayerStatusIndicator } from './LayerStatusIndicator';
import { Thermometer, Wind, SunMedium, Layers as LayersIcon, ChevronRight } from 'lucide-react';

interface LayerCardProps {
  layerId: LayerId;
}

const getLayerIcon = (type: LayerType) => {
  switch (type) {
    case 'temperature':
      return <Thermometer size={18} className="layer-type-icon text-red" />;
    case 'wind':
      return <Wind size={18} className="layer-type-icon text-cyan" />;
    case 'insolation':
      return <SunMedium size={18} className="layer-type-icon text-amber" />;
    default:
      return <LayersIcon size={18} className="layer-type-icon text-indigo" />;
  }
};

export const LayerCard: React.FC<LayerCardProps> = React.memo(({ layerId }) => {
  const { layer, isSelected, toggle, retry, setOpacity, select } = useLayer(layerId);
  const { renderCount, isFlashing } = useRenderTracker();
  const toggleId = useId();
  const sliderId = useId();

  if (!layer) return null;

  const isEnabled = layer.enabled;
  const isLoaded = isEnabled && layer.status === 'success';

  return (
    <div
      className={`layer-card ${isEnabled ? 'is-enabled' : 'is-disabled'} ${
        isSelected ? 'is-selected' : ''
      } ${isFlashing ? 'layer-card-rendered' : ''}`}
      onClick={select}
      role="region"
      aria-label={`Слой ${layer.title}`}
    >
      {/* Card Header */}
      <div className="layer-card-header">
        <div className="layer-card-title-group">
          <div className="layer-card-icon-wrap">{getLayerIcon(layer.type)}</div>
          <div className="layer-card-meta">
            <h4 className="layer-card-title">{layer.title}</h4>
            <p className="layer-card-subtitle">{layer.subtitle}</p>
          </div>
        </div>

        <div className="layer-card-controls-top" onClick={(e) => e.stopPropagation()}>
          <RenderBadge count={renderCount} isFlashing={isFlashing} />
          <ToggleSwitch
            id={toggleId}
            checked={isEnabled}
            onChange={toggle}
            ariaLabel={`Включить или выключить слой ${layer.title}`}
          />
        </div>
      </div>

      {/* Status & Diagnostics */}
      <div className="layer-card-body" onClick={(e) => e.stopPropagation()}>
        <LayerStatusIndicator
          status={layer.status}
          enabled={isEnabled}
          error={layer.error}
          onRetry={retry}
        />

        {/* Controls active when enabled */}
        {isEnabled && (
          <div className="layer-card-sliders">
            <Slider
              id={sliderId}
              value={layer.opacity}
              onChange={setOpacity}
              disabled={layer.status === 'loading'}
              label="Прозрачность растра"
            />
          </div>
        )}

        {/* Legend / Quick Tile Info when loaded */}
        {isLoaded && layer.data && (
          <div className="layer-card-footer">
            <div className="layer-legend-bar">
              {layer.data.metadata.legend.map((item, idx) => (
                <div
                  key={idx}
                  className="legend-swatch"
                  style={{ backgroundColor: item.color }}
                  title={`${item.label} (${layer.data?.metadata.unit ?? ''})`}
                />
              ))}
            </div>
            <div className="layer-tile-stats">
              <span>{layer.data.resolution}</span>
              <span>•</span>
              <span>{layer.data.tileCount} тайлов</span>
              <ChevronRight size={14} className="layer-tile-chevron" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

LayerCard.displayName = 'LayerCard';
