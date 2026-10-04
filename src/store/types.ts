/**
 * Cartographic Layer Domain Types
 * Strict typing without any `any`.
 */

export type LayerId = string;

export type LayerType = 'temperature' | 'wind' | 'insolation' | 'custom';

export type LayerStatus = 'idle' | 'loading' | 'success' | 'error';

export interface LegendItem {
  readonly color: string;
  readonly label: string;
}

export interface HeatmapSamplePoint {
  readonly x: number; // 0 - 1 normalized coordinate
  readonly y: number; // 0 - 1 normalized coordinate
  readonly val: number;
  readonly intensity: number;
}

export interface LayerMetadata {
  readonly unit: string;
  readonly minValue: number;
  readonly maxValue: number;
  readonly legend: readonly LegendItem[];
  readonly samplePoints: readonly HeatmapSamplePoint[];
}

export interface LayerData {
  readonly id: LayerId;
  readonly type: LayerType;
  readonly generatedAt: number;
  readonly tileCount: number;
  readonly resolution: string;
  readonly metadata: LayerMetadata;
}

export interface LayerState {
  readonly id: LayerId;
  readonly title: string;
  readonly subtitle: string;
  readonly type: LayerType;
  readonly enabled: boolean;
  readonly opacity: number; // 0.0 - 1.0
  readonly status: LayerStatus;
  readonly error: string | null;
  readonly data: LayerData | null;
  readonly lastUpdated: number | null;
}

export interface NetworkConfig {
  latencyMs: number;
  forceError: boolean;
  errorRate: number; // 0.0 to 1.0 probability
}

export interface LogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly layerId: LayerId;
  readonly action: 'REQUEST_START' | 'REQUEST_SUCCESS' | 'REQUEST_ERROR' | 'REQUEST_ABORTED' | 'TOGGLE' | 'OPACITY';
  readonly message: string;
  readonly token: number;
}

export interface LayersStoreState {
  readonly layers: Readonly<Record<LayerId, LayerState>>;
  readonly layerIds: readonly LayerId[];
  readonly selectedLayerId: LayerId | null;
  readonly networkConfig: NetworkConfig;
  readonly logs: readonly LogEntry[];
}
