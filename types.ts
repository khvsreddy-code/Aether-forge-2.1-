export interface GenerationState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  message?: string;
}

export interface ModelSettings {
  displacementScale: number;
  wireframe: boolean;
  meshColor: string;
  metalness: number;
  roughness: number;
}
