import React from 'react';
import { LayerStatus } from '../../store/types';
import { Loader2, CheckCircle2, AlertCircle, CircleDot } from 'lucide-react';

interface StatusBadgeProps {
  status: LayerStatus;
  enabled: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(({ status, enabled }) => {
  if (!enabled) {
    return (
      <span className="status-badge status-idle">
        <CircleDot className="status-badge-icon" size={12} />
        <span>Выключен</span>
      </span>
    );
  }

  switch (status) {
    case 'loading':
      return (
        <span className="status-badge status-loading">
          <Loader2 className="status-badge-icon animate-spin" size={12} />
          <span>Загрузка...</span>
        </span>
      );
    case 'success':
      return (
        <span className="status-badge status-success">
          <CheckCircle2 className="status-badge-icon" size={12} />
          <span>Готов</span>
        </span>
      );
    case 'error':
      return (
        <span className="status-badge status-error">
          <AlertCircle className="status-badge-icon" size={12} />
          <span>Ошибка</span>
        </span>
      );
    case 'idle':
    default:
      return (
        <span className="status-badge status-idle">
          <CircleDot className="status-badge-icon" size={12} />
          <span>Ожидание</span>
        </span>
      );
  }
});

StatusBadge.displayName = 'StatusBadge';
