export interface GenerationState {
  status: 'idle' | 'uploading' | 'scanning_front' | 'dreaming_back' | 'calculating_volume' | 'success' | 'error';
  message?: string;
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
  displacementScale: number;
  wireframe: boolean;
  meshColor: string;
  metalness: number;
  roughness: number;
}