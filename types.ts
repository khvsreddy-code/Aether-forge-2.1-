export interface GenerationState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  message?: string;
  progress?: number;
}

export type NeuralModel = 
  | 'TripoSR' 
  | 'Trellis' 
  | 'InstantMesh' 
  | 'Hunyuan3D' 
  | 'Point-E' 
  | 'DreamFusion' 
  | 'StableDiffusion3D' 
  | '3DTopia';

export interface ModelSettings {
  model: NeuralModel;
  apiKey: string;
  wireframe: boolean;
  meshColor: string;
  autoRotate: boolean;
}