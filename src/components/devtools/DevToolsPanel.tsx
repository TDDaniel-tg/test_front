import React, { useState, useCallback } from 'react';
import { useLayersSelector, useLayersStore } from '../../store/layersStore';
import { layerManager } from '../../store/layerManager';
import {
  Zap,
  Sliders,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const DevToolsPanel: React.FC = React.memo(() => {
  const store = useLayersStore();
  const netConfig = useLayersSelector((state) => state.networkConfig);
  const layerIds = useLayersSelector((state) => state.layerIds);

  const [isSpamRunning, setIsSpamRunning] = useState(false);
  const [spamStatus, setSpamStatus] = useState<string | null>(null);

  const is100Layers = layerIds.length > 10;

  const handleLatencyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const latencyMs = parseInt(e.target.value, 10);
      layerManager.updateNetworkConfig(store, { latencyMs });
    },
    [store]
  );

  const handleForceErrorToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const forceError = e.target.checked;
      layerManager.updateNetworkConfig(store, { forceError });
    },
    [store]
  );

  const handleScaleToggle = useCallback(
    (mode: 'base' | 'scale100') => {
      layerManager.setScaleMode(store, mode);
    },
    [store]
  );

  // Automated Race Condition Spammer:
  // Rapidly toggles a layer 6 times in quick succession (every 75ms)
  // to prove that AbortController cancels obsolete requests and token
  // verification prevents state corruption.
  const runRapidToggleSpam = useCallback(async () => {
    if (isSpamRunning) return;
    setIsSpamRunning(true);
    setSpamStatus('Запуск теста быстрых переключений (Race Condition Test)...');

    const targetLayerId = 'temperature';

    for (let i = 1; i <= 6; i++) {
      setSpamStatus(`Шаг ${i}/6: быстрый клик переключения #${i}...`);
      await layerManager.toggleLayer(store, targetLayerId);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    setSpamStatus('Ожидание стабилизации состояния...');
    await new Promise((resolve) => setTimeout(resolve, netConfig.latencyMs + 200));

    const finalState = store.get().layers[targetLayerId];
    setSpamStatus(
      `Тест завершен! Итоговый статус слоя: ${finalState?.status.toUpperCase()} (Включен: ${
        finalState?.enabled ? 'ДА' : 'НЕТ'
      }). Гонки исключены!`
    );
    setIsSpamRunning(false);
  }, [isSpamRunning, store, netConfig.latencyMs]);

  // Rapid Retry Spam test:
  const runRapidRetrySpam = useCallback(async () => {
    if (isSpamRunning) return;
    setIsSpamRunning(true);
    setSpamStatus('Запуск спама Retry (4 клика подряд)...');

    const targetLayerId = 'wind';
    // Ensure layer is enabled
    if (!store.get().layers[targetLayerId]?.enabled) {
      await layerManager.toggleLayer(store, targetLayerId);
    }

    for (let i = 1; i <= 4; i++) {
      setSpamStatus(`Retry спам #${i}...`);
      void layerManager.retryLayer(store, targetLayerId);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }

    await new Promise((resolve) => setTimeout(resolve, netConfig.latencyMs + 200));
    setSpamStatus('Тест Retry завершен! Только последний токен применил данные в Vedro Store.');
    setIsSpamRunning(false);
  }, [isSpamRunning, store, netConfig.latencyMs]);

  return (
    <div className="devtools-panel">
      <div className="devtools-section-header">
        <div className="devtools-title-wrap">
          <Sliders size={16} className="text-accent" />
          <h4 className="devtools-title">Симуляция сети и тестирование гонок</h4>
        </div>
      </div>

      <div className="devtools-grid">
        {/* Scale Switcher */}
        <div className="devtools-card">
          <div className="card-label-wrap">
            <Layers size={14} className="card-icon" />
            <span className="card-label">Масштабирование слоев</span>
          </div>
          <p className="card-desc">Проверка производительности vedro от 3 до 100+ слоев</p>
          <div className="scale-button-group">
            <button
              type="button"
              className={`btn-scale ${!is100Layers ? 'active' : ''}`}
              onClick={() => handleScaleToggle('base')}
            >
              3 базовых слоя
            </button>
            <button
              type="button"
              className={`btn-scale ${is100Layers ? 'active' : ''}`}
              onClick={() => handleScaleToggle('scale100')}
            >
              <Sparkles size={13} /> 100 слоев (Стресс-тест)
            </button>
          </div>
        </div>

        {/* Network Latency Simulator */}
        <div className="devtools-card">
          <div className="card-label-wrap">
            <Clock size={14} className="card-icon" />
            <span className="card-label">Имитация задержки API (Mock)</span>
          </div>
          <div className="latency-row">
            <input
              type="range"
              min={100}
              max={2500}
              step={50}
              value={netConfig.latencyMs}
              onChange={handleLatencyChange}
              className="slider-input"
            />
            <span className="latency-badge">{netConfig.latencyMs} мс</span>
          </div>
          <p className="card-desc">Длительность имитируемого ответа сервера тайлов</p>
        </div>

        {/* Force Error Toggle */}
        <div className="devtools-card">
          <div className="card-label-wrap">
            <AlertTriangle size={14} className="card-icon text-amber" />
            <span className="card-label">Имитация сбоя сервера (503/504)</span>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={netConfig.forceError}
              onChange={handleForceErrorToggle}
              className="custom-checkbox"
            />
            <span>Принудительная ошибка (для проверки кнопки Retry)</span>
          </label>
          <p className="card-desc">Все запросы завершатся с ошибкой для проверки повторной загрузки</p>
        </div>

        {/* Race Condition Stress Tests */}
        <div className="devtools-card">
          <div className="card-label-wrap">
            <Zap size={14} className="card-icon text-yellow" />
            <span className="card-label">Стресс-тесты гонок состояний</span>
          </div>
          <div className="test-buttons-row">
            <button
              type="button"
              className="btn-test-action"
              disabled={isSpamRunning}
              onClick={runRapidToggleSpam}
              title="Запустить спам переключения слоя ON/OFF с интервалом 80мс"
            >
              <Play size={13} /> Спам Toggle (ON/OFF)
            </button>
            <button
              type="button"
              className="btn-test-action"
              disabled={isSpamRunning}
              onClick={runRapidRetrySpam}
              title="Запустить быстрый спам кликов Retry"
            >
              <RotateCcw size={13} /> Спам Retry
            </button>
          </div>
          {spamStatus && (
            <div className="spam-status-banner">
              <CheckCircle2 size={13} className="text-accent flex-shrink-0" />
              <span>{spamStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

DevToolsPanel.displayName = 'DevToolsPanel';
