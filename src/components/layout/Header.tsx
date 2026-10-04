import React, { useState } from 'react';
import { useLayersSelector } from '../../store/layersStore';
import { Map, Layers, ShieldCheck } from 'lucide-react';
import { ArchitectureModal } from './ArchitectureModal';

export const Header: React.FC = React.memo(() => {
  const layerIds = useLayersSelector((state) => state.layerIds);
  const layersMap = useLayersSelector((state) => state.layers);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeCount = layerIds.filter((id) => layersMap[id]?.enabled).length;
  const isStressTest = layerIds.length > 5;

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <div className="logo-badge">
            <Map size={20} className="logo-icon text-accent" />
          </div>
          <div>
            <h1 className="header-title">GIS Carto Layers Studio</h1>
            <p className="header-subtitle">
              Управление картографическими слоями • <strong>vedro store</strong> • React 19 + TypeScript
            </p>
          </div>
        </div>

        <div className="header-right">
          <div className="header-stats-group">
            <div className="stat-pill">
              <span className="stat-pill-label">Слои:</span>
              <span className="stat-pill-val">
                {activeCount} / {layerIds.length}
              </span>
            </div>

            <div className={`stat-pill ${isStressTest ? 'pill-scale' : 'pill-base'}`}>
              <Layers size={13} />
              <span>{isStressTest ? '100+ слоёв' : 'Базовые 3 слоя'}</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-arch-info"
            onClick={() => setIsModalOpen(true)}
            title="Посмотреть архитектурный отчет и разбор требований задания"
          >
            <ShieldCheck size={15} />
            <span>Архитектура & Решение</span>
          </button>
        </div>
      </header>

      <ArchitectureModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
});

Header.displayName = 'Header';
