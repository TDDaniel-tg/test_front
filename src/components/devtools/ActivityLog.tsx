import React, { useCallback } from 'react';
import { useLayersSelector, useLayersStore } from '../../store/layersStore';
import { layerManager } from '../../store/layerManager';
import { Terminal, Trash2, ShieldAlert, CheckCircle, Clock, Zap } from 'lucide-react';
import { LogEntry } from '../../store/types';

const getActionBadge = (action: LogEntry['action']) => {
  switch (action) {
    case 'REQUEST_START':
      return (
        <span className="log-badge badge-start">
          <Clock size={11} /> START
        </span>
      );
    case 'REQUEST_SUCCESS':
      return (
        <span className="log-badge badge-success">
          <CheckCircle size={11} /> SUCCESS
        </span>
      );
    case 'REQUEST_ERROR':
      return (
        <span className="log-badge badge-error">
          <ShieldAlert size={11} /> ERROR
        </span>
      );
    case 'REQUEST_ABORTED':
      return (
        <span className="log-badge badge-aborted">
          <Zap size={11} /> ABORTED
        </span>
      );
    case 'TOGGLE':
    case 'OPACITY':
    default:
      return <span className="log-badge badge-info">{action}</span>;
  }
};

export const ActivityLog: React.FC = React.memo(() => {
  const store = useLayersStore();
  const logs = useLayersSelector((state) => state.logs);

  const handleClear = useCallback(() => {
    layerManager.clearLogs(store);
  }, [store]);

  return (
    <div className="activity-log-panel">
      <div className="activity-log-header">
        <div className="activity-title-wrap">
          <Terminal size={15} className="text-accent" />
          <h4 className="activity-title">Журнал событий и гонок (Audit Log)</h4>
          <span className="log-count-badge">{logs.length}</span>
        </div>

        {logs.length > 0 && (
          <button
            type="button"
            className="btn-clear-logs"
            onClick={handleClear}
            title="Очистить журнал"
          >
            <Trash2 size={13} /> Очистить
          </button>
        )}
      </div>

      <div className="activity-log-body">
        {logs.length === 0 ? (
          <div className="empty-log-state">Журнал пуст. Включите слой для наблюдения за запросами.</div>
        ) : (
          <div className="log-entries-list">
            {logs.map((entry) => {
              const timeStr = new Date(entry.timestamp).toLocaleTimeString('ru-RU', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                fractionalSecondDigits: 3,
              });

              return (
                <div key={entry.id} className={`log-entry log-entry-${entry.action.toLowerCase()}`}>
                  <span className="log-time">{timeStr}</span>
                  <div className="log-action-wrap">{getActionBadge(entry.action)}</div>
                  <span className="log-layer-id">[{entry.layerId}]</span>
                  <span className="log-message">{entry.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

ActivityLog.displayName = 'ActivityLog';
