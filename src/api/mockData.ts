import { LayerData, LayerId, LayerMetadata, LayerState, LayerType } from '../store/types';

// Deterministic mock sample generators for visual map rendering
function generateSamplePoints(
  seed: number,
  count: number,
  minVal: number,
  maxVal: number
): LayerMetadata['samplePoints'] {
  const points: { x: number; y: number; val: number; intensity: number }[] = [];
  for (let i = 0; i < count; i++) {
    // Simple deterministic pseudo-random distribution
    const pseudoRandX = Math.abs(Math.sin(seed * 997 + i * 13.37));
    const pseudoRandY = Math.abs(Math.cos(seed * 443 + i * 19.81));
    const val = minVal + (maxVal - minVal) * Math.abs(Math.sin(seed + i * 5.71));
    const intensity = Math.min(1, Math.max(0.1, (val - minVal) / (maxVal - minVal || 1)));

    points.push({
      x: pseudoRandX,
      y: pseudoRandY,
      val: Math.round(val * 10) / 10,
      intensity,
    });
  }
  return points;
}

export const INITIAL_BASE_LAYERS: Record<LayerId, LayerState> = {
  temperature: {
    id: 'temperature',
    title: 'Температура воздуха',
    subtitle: 'Термометрия на высоте 2 м (°C)',
    type: 'temperature',
    enabled: false,
    opacity: 0.85,
    status: 'idle',
    error: null,
    data: null,
    lastUpdated: null,
  },
  wind: {
    id: 'wind',
    title: 'Векторное поле ветра',
    subtitle: 'Скорость и направление воздушных потоков (м/с)',
    type: 'wind',
    enabled: false,
    opacity: 0.75,
    status: 'idle',
    error: null,
    data: null,
    lastUpdated: null,
  },
  insolation: {
    id: 'insolation',
    title: 'Солнечная инсоляция',
    subtitle: 'Суммарная солнечная радиация (кВт·ч/м²)',
    type: 'insolation',
    enabled: false,
    opacity: 0.7,
    status: 'idle',
    error: null,
    data: null,
    lastUpdated: null,
  },
};

export const BASE_LAYER_IDS: readonly LayerId[] = ['temperature', 'wind', 'insolation'];

export function createMockLayerData(layerId: LayerId, type: LayerType): LayerData {
  const now = Date.now();

  switch (type) {
    case 'temperature':
      return {
        id: layerId,
        type: 'temperature',
        generatedAt: now,
        tileCount: 16,
        resolution: '0.1° GFS Reanalysis',
        metadata: {
          unit: '°C',
          minValue: -25,
          maxValue: 38,
          legend: [
            { color: '#313695', label: '< -15°' },
            { color: '#4575b4', label: '-5°' },
            { color: '#abd9e9', label: '+5°' },
            { color: '#fee090', label: '+15°' },
            { color: '#f46d43', label: '+25°' },
            { color: '#a50026', label: '> +35°' },
          ],
          samplePoints: generateSamplePoints(42, 28, -25, 38),
        },
      };

    case 'wind':
      return {
        id: layerId,
        type: 'wind',
        generatedAt: now,
        tileCount: 24,
        resolution: '10m Vector Grid ECMWF',
        metadata: {
          unit: 'м/с',
          minValue: 0,
          maxValue: 32,
          legend: [
            { color: '#e0f3f8', label: '0-3 м/с (Штиль)' },
            { color: '#67a9cf', label: '4-8 м/с (Умеренный)' },
            { color: '#02818a', label: '9-14 м/с (Свежий)' },
            { color: '#bd0026', label: '> 18 м/с (Шторм)' },
          ],
          samplePoints: generateSamplePoints(107, 36, 1, 32),
        },
      };

    case 'insolation':
      return {
        id: layerId,
        type: 'insolation',
        generatedAt: now,
        tileCount: 12,
        resolution: '1km HIMAWARI / MSG Solar',
        metadata: {
          unit: 'кВт·ч/м²',
          minValue: 0,
          maxValue: 8.5,
          legend: [
            { color: '#440154', label: '< 1.5 (Низкая)' },
            { color: '#3b528b', label: '3.0' },
            { color: '#21918c', label: '4.5' },
            { color: '#5ec962', label: '6.0' },
            { color: '#fde725', label: '> 7.5 (Экстремальная)' },
          ],
          samplePoints: generateSamplePoints(256, 32, 0.5, 8.5),
        },
      };

    default:
      return {
        id: layerId,
        type: 'custom',
        generatedAt: now,
        tileCount: 8,
        resolution: 'Synthetic GeoRaster',
        metadata: {
          unit: 'индекс',
          minValue: 0,
          maxValue: 100,
          legend: [
            { color: '#2c7bb6', label: 'Min' },
            { color: '#ffffbf', label: 'Mid' },
            { color: '#d7191c', label: 'Max' },
          ],
          samplePoints: generateSamplePoints(parseInt(layerId.replace(/\D/g, '') || '1', 10), 20, 0, 100),
        },
      };
  }
}

/**
 * Generates 100+ realistic cartographic layers for stress-testing scalability.
 */
const SCALABLE_TITLES = [
  'Атмосферное давление',
  'Относительная влажность',
  'Интенсивность осадков',
  'Толщина снежного покрова',
  'Концентрация озона (O3)',
  'Качество воздуха PM2.5',
  'Вегетационный индекс NDVI',
  'Температура поверхности моря (SST)',
  'Плотность облачного покрова',
  'Высота нижней границы облаков',
  'Геопотенциальная высота H500',
  'Точка росы',
  'Индекс ультрафиолета (UV)',
  'Пожароопасность лесов (FWI)',
  'Влажность почвы (0-10 см)',
  'Запыленность атмосферы AOD',
  'Потенциальная испаряемость',
  'Высота морских волн',
  'Период зыби',
  'Морские течения',
];

export function generateScaleLayers(totalCount = 100): {
  layers: Record<LayerId, LayerState>;
  layerIds: LayerId[];
} {
  const layers: Record<LayerId, LayerState> = { ...INITIAL_BASE_LAYERS };
  const layerIds: LayerId[] = [...BASE_LAYER_IDS];

  for (let i = 4; i <= totalCount; i++) {
    const id = `layer_${i}`;
    const titleTemplate = SCALABLE_TITLES[(i - 4) % SCALABLE_TITLES.length];
    const regionIdx = Math.floor((i - 4) / SCALABLE_TITLES.length) + 1;
    const title = regionIdx > 1 ? `${titleTemplate} (Зона #${regionIdx})` : titleTemplate;

    layers[id] = {
      id,
      title,
      subtitle: `Картографический слой #${i} (${id})`,
      type: 'custom',
      enabled: false,
      opacity: 0.8,
      status: 'idle',
      error: null,
      data: null,
      lastUpdated: null,
    };
    layerIds.push(id);
  }

  return { layers, layerIds };
}
