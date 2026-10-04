import React from 'react';
import { LayerStatus } from '../../store/types';
import { RotateCw, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../ui/Badge';

interface LayerStatusIndicatorProps {
  status: LayerStatus;
  enabled: boolean;
  error: string | null;
  onRetry: () => void;
}

export const LayerStatusIndicator: React.FC<LayerStatusIndicatorProps> = React.memo(
  ({ status, enabled, error, onRetry }) => {
    return (
      <div className="layer-status-wrapper">
        <StatusBadge status={status} enabled={enabled} />

        {enabled && status === 'error' && (
          <div className="layer-error-container">
            <div className="layer-error-msg" title={error ?? 'Неизвестная ошибка'}>
              <AlertTriangle size={13} className="layer-error-icon" />
              <span>{error ?? 'Сбой запроса к тайловому серверу'}</span>
            </div>
            <button
              type="button"
              className="btn-retry"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              title="Повторить загрузку слоя (новая попытка запроса)"
            >
              <RotateCw size={13} className="btn-retry-icon" />
              <span>Повторить</span>
            </button>
          </div>
        )}
      </div>
    );
  }
);

LayerStatusIndicator.displayName = 'LayerStatusIndicator';
