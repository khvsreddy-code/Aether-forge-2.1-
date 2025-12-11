export interface GenerationState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  message?: string;
  progress?: number;
}

export type NeuralModel = 
  | 'Trellis' 
  | 'StableFast3D'
  | 'TripoSR' 
  | 'InstantMesh' 
  | 'Hunyuan3D' 
  | 'Point-E';

export type EnvironmentType = 'city' | 'studio' | 'sunset' | 'dawn' | 'night';

export interface ModelSettings {
  model: NeuralModel;
  hfToken: string;
  wireframe: boolean;
  meshColor: string;
  autoRotate: boolean;
  environment: EnvironmentType;
  showGrid: boolean;
  seed: number;
}

export interface HistoryItem {
  id: string;
  thumbnail: string;
  modelUrl: string;
  modelType: NeuralModel;
  timestamp: number;
}