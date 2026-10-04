import React, { useState } from 'react';
import { LayersStoreProvider } from './store/layersStore';
import { Header } from './components/layout/Header';
import { LayersList } from './components/layers/LayersList';
import { MapCanvas } from './components/map/MapCanvas';
import { DevToolsPanel } from './components/devtools/DevToolsPanel';
import { ActivityLog } from './components/devtools/ActivityLog';
import { Sliders, Terminal } from 'lucide-react';
import './App.css';

const MainLayout: React.FC = () => {
  const [activeBottomTab, setActiveBottomTab] = useState<'devtools' | 'logs'>('devtools');

  return (
    <div className="app-container">
      <Header />

      <main className="app-main-grid">
        {/* Left Sidebar: Cartographic Layers Control */}
        <aside className="app-sidebar">
          <LayersList />
        </aside>

        {/* Right Section: Interactive Map + Diagnostics & DevTools */}
        <section className="app-content-area">
          <div className="map-view-wrapper">
            <MapCanvas />
          </div>

          <div className="diagnostics-panel-wrapper">
            <div className="diagnostics-tab-bar">
              <button
                type="button"
                className={`diag-tab ${activeBottomTab === 'devtools' ? 'active' : ''}`}
                onClick={() => setActiveBottomTab('devtools')}
              >
                <Sliders size={14} />
                <span>Симуляция сети, гонки и масштабирование</span>
              </button>
              <button
                type="button"
                className={`diag-tab ${activeBottomTab === 'logs' ? 'active' : ''}`}
                onClick={() => setActiveBottomTab('logs')}
              >
                <Terminal size={14} />
                <span>Журнал событий и отмены запросов (Audit Log)</span>
              </button>
            </div>

            <div className="diagnostics-tab-content">
              {activeBottomTab === 'devtools' ? <DevToolsPanel /> : <ActivityLog />}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LayersStoreProvider>
      <MainLayout />
    </LayersStoreProvider>
  );
};

export default App;
