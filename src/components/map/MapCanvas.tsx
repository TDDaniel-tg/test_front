import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useLayersSelector } from '../../store/layersStore';
import { useRenderTracker } from '../../hooks/useRenderTracker';
import { RenderBadge } from '../ui/RenderBadge';
import { Compass, Layers, Loader2, AlertCircle } from 'lucide-react';
import { LayerState } from '../../store/types';

export const MapCanvas: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const layersMap = useLayersSelector((state) => state.layers);
  const layerIds = useLayersSelector((state) => state.layerIds);
  const selectedLayerId = useLayersSelector((state) => state.selectedLayerId);

  const { renderCount, isFlashing } = useRenderTracker();

  // Mouse hover coordinate readout
  const [coords, setCoords] = useState<{ lat: number; lon: number; x: number; y: number } | null>(
    null
  );

  // Active loaded layers to render on canvas
  const activeLayers = useMemo(() => {
    return layerIds
      .map((id) => layersMap[id])
      .filter((layer): layer is LayerState => Boolean(layer && layer.enabled));
  }, [layerIds, layersMap]);

  const loadingCount = useMemo(
    () => activeLayers.filter((l) => l.status === 'loading').length,
    [activeLayers]
  );
  const errorCount = useMemo(
    () => activeLayers.filter((l) => l.status === 'error').length,
    [activeLayers]
  );

  const selectedLayer = selectedLayerId ? layersMap[selectedLayerId] : null;

  // Animation frame loop for dynamic cartographic rendering (wind vectors, pulse, etc.)
  useEffect(() => {
    let animId: number;
    let tick = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      tick += 1;
      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear & draw dark geospatial background
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Geo-grid & Coordinates
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const stepX = width / 8;
      const stepY = height / 6;

      for (let x = 0; x <= width; x += stepX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += stepY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw stylized continents / landmass silhouettes
      ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      // Landmass 1 (Eurasia-like shape)
      ctx.ellipse(width * 0.42, height * 0.45, width * 0.28, height * 0.22, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      // Landmass 2 (Americas-like shape)
      ctx.ellipse(width * 0.82, height * 0.52, width * 0.14, height * 0.32, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 3. Render Cartographic Raster Layers in order
      for (const layer of activeLayers) {
        if (layer.status !== 'success' || !layer.data) continue;

        ctx.save();
        ctx.globalAlpha = layer.opacity;

        const points = layer.data.metadata.samplePoints;

        if (layer.type === 'temperature') {
          // Temperature Heatmap Layer: Smooth blended radial gradients
          ctx.globalCompositeOperation = 'screen';
          points.forEach((pt) => {
            const px = pt.x * width;
            const py = pt.y * height;
            const radius = 90 + Math.sin(tick * 0.02 + pt.val) * 10;

            const grad = ctx.createRadialGradient(px, py, 5, px, py, radius);
            if (pt.val > 25) {
              grad.addColorStop(0, 'rgba(239, 68, 68, 0.85)'); // Red
              grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.4)');
              grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            } else if (pt.val > 10) {
              grad.addColorStop(0, 'rgba(234, 179, 8, 0.75)'); // Yellow
              grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.35)');
              grad.addColorStop(1, 'rgba(234, 179, 8, 0)');
            } else if (pt.val > 0) {
              grad.addColorStop(0, 'rgba(16, 185, 129, 0.65)'); // Green-teal
              grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.3)');
              grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
            } else {
              grad.addColorStop(0, 'rgba(59, 130, 246, 0.8)'); // Blue
              grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.35)');
              grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
            }

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();
          });
        } else if (layer.type === 'wind') {
          // Wind Vector Streamlines: dynamic flowing lines with velocity vectors
          ctx.strokeStyle = '#38bdf8';
          ctx.fillStyle = '#38bdf8';

          points.forEach((pt, i) => {
            const px = pt.x * width;
            const py = pt.y * height;

            // Flow velocity angle
            const angle = pt.val * 0.15 + tick * 0.035;
            const length = 18 + (pt.intensity * 25);

            const endX = px + Math.cos(angle) * length;
            const endY = py + Math.sin(angle) * length;

            ctx.lineWidth = 1.5 + pt.intensity * 2;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Arrow head or particle
            const headlen = 5;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - headlen * Math.cos(angle - Math.PI / 6),
              endY - headlen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              endX - headlen * Math.cos(angle + Math.PI / 6),
              endY - headlen * Math.sin(angle + Math.PI / 6)
            );
            ctx.fill();

            // Wind speed label every few points
            if (i % 5 === 0) {
              ctx.font = '10px monospace';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.fillText(`${pt.val} m/s`, px + 8, py - 4);
            }
          });
        } else if (layer.type === 'insolation') {
          // Insolation / Solar radiation contours: glowing concentric solar flux fields
          ctx.globalCompositeOperation = 'screen';
          points.forEach((pt) => {
            const px = pt.x * width;
            const py = pt.y * height;
            const maxR = 60 + pt.intensity * 50;

            const grad = ctx.createRadialGradient(px, py, 2, px, py, maxR);
            grad.addColorStop(0, 'rgba(253, 224, 71, 0.8)'); // Bright yellow core
            grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.45)'); // Warm amber
            grad.addColorStop(0.8, 'rgba(168, 85, 247, 0.2)'); // Violet fringe
            grad.addColorStop(1, 'rgba(168, 85, 247, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(px, py, maxR, 0, Math.PI * 2);
            ctx.fill();

            // Radiation contour rings
            ctx.strokeStyle = 'rgba(253, 224, 71, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, py, maxR * 0.6, 0, Math.PI * 2);
            ctx.stroke();
          });
        } else {
          // Custom scalable layers: synthetic radar grid
          ctx.strokeStyle = 'rgba(129, 140, 248, 0.6)';
          ctx.fillStyle = 'rgba(129, 140, 248, 0.2)';
          points.forEach((pt) => {
            const px = pt.x * width;
            const py = pt.y * height;
            ctx.beginPath();
            ctx.rect(px - 10, py - 10, 20, 20);
            ctx.fill();
            ctx.stroke();
          });
        }

        ctx.restore();
      }

      // 4. Draw interactive crosshair if hovering
      if (coords && coords.x >= 0 && coords.x <= width && coords.y >= 0 && coords.y <= height) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(coords.x, 0);
        ctx.lineTo(coords.x, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, coords.y);
        ctx.lineTo(width, coords.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(coords.x, coords.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#6366f1';
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [activeLayers, coords]);

  // Handle Canvas resize
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lat = 90 - (y / rect.height) * 180;
    const lon = (x / rect.width) * 360 - 180;

    setCoords({
      x,
      y,
      lat: Math.round(lat * 100) / 100,
      lon: Math.round(lon * 100) / 100,
    });
  };

  const handleMouseLeave = () => setCoords(null);

  return (
    <div className="map-viewport" ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <canvas ref={canvasRef} className="map-canvas" />

      {/* Map Header / Overlays */}
      <div className="map-overlay-top">
        <div className="map-brand-chip">
          <Compass size={16} className="compass-icon animate-pulse" />
          <span>Синтетический гео-растр (WGS84)</span>
        </div>

        <div className="map-status-chips">
          {loadingCount > 0 && (
            <div className="map-chip map-chip-loading">
              <Loader2 size={13} className="animate-spin" />
              <span>Загрузка {loadingCount} слоев</span>
            </div>
          )}
          {errorCount > 0 && (
            <div className="map-chip map-chip-error">
              <AlertCircle size={13} />
              <span>{errorCount} ошибка(и)</span>
            </div>
          )}

          <div className="map-render-proof">
            <span className="proof-label">Canvas Render:</span>
            <RenderBadge count={renderCount} isFlashing={isFlashing} />
          </div>
        </div>
      </div>

      {/* Crosshair Coordinates readout */}
      {coords && (
        <div className="map-coords-readout">
          <span>
            {coords.lat >= 0 ? `${coords.lat}° N` : `${Math.abs(coords.lat)}° S`},{' '}
            {coords.lon >= 0 ? `${coords.lon}° E` : `${Math.abs(coords.lon)}° W`}
          </span>
        </div>
      )}

      {/* Selected Layer Legend HUD */}
      {selectedLayer && selectedLayer.enabled && selectedLayer.status === 'success' && selectedLayer.data && (
        <div className="map-legend-hud">
          <div className="hud-header">
            <div className="hud-title-wrap">
              <Layers size={14} className="text-accent" />
              <span className="hud-title">{selectedLayer.title}</span>
            </div>
            <span className="hud-unit">{selectedLayer.data.metadata.unit}</span>
          </div>

          <div className="hud-gradient-bar">
            {selectedLayer.data.metadata.legend.map((item, idx) => (
              <div
                key={idx}
                className="hud-color-segment"
                style={{ backgroundColor: item.color }}
                title={item.label}
              />
            ))}
          </div>

          <div className="hud-labels">
            <span>{selectedLayer.data.metadata.legend[0]?.label}</span>
            <span>
              {selectedLayer.data.metadata.legend[selectedLayer.data.metadata.legend.length - 1]?.label}
            </span>
          </div>
        </div>
      )}

      {/* Inactive overlay hint if nothing is enabled */}
      {activeLayers.length === 0 && (
        <div className="map-empty-hint">
          <Layers size={32} className="map-empty-icon" />
          <h4>Нет включенных картографических слоев</h4>
          <p>Включите один или несколько слоев в боковой панели (Температура, Ветер, Инсоляция)</p>
        </div>
      )}
    </div>
  );
});

MapCanvas.displayName = 'MapCanvas';
