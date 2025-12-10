import React, { useState, useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, Sparkles, Box } from 'lucide-react';
import { Viewer3D } from './components/Viewer3D';
import { Controls } from './components/Controls';
import { generateDepthMap } from './services/gemini';
import { GenerationState, ModelSettings } from './types';
import * as THREE from 'three';
import { OBJExporter } from 'three-stdlib';

const INITIAL_SETTINGS: ModelSettings = {
  displacementScale: 1.5,
  wireframe: false,
  meshColor: '#ffffff',
  metalness: 0.2,
  roughness: 0.5,
};

function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [depthMap, setDepthMap] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationState>({ status: 'idle' });
  const [settings, setSettings] = useState<ModelSettings>(INITIAL_SETTINGS);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  const meshRef = useRef<THREE.Mesh | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setOriginalImage(event.target.result as string);
          setDepthMap(null); 
          setStatus({ status: 'idle' });
          setGenerationProgress(0);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!originalImage) return;

    setStatus({ status: 'processing', message: 'Analyzing structure...' });
    setGenerationProgress(0);
    
    try {
      const depthData = await generateDepthMap(originalImage);
      setDepthMap(depthData);
      setStatus({ status: 'success', message: 'Building 3D Mesh...' }); // Intermediate success before mesh build
    } catch (error) {
      setStatus({ status: 'error', message: 'Failed to generate depth map.' });
    }
  };

  const handleDownload = () => {
    if (!meshRef.current) return;
    
    // Apply current scale to geometry for export
    // The visual scale is on the mesh object, but exporter might read geometry.
    // We clone to avoid messing up the view
    const meshClone = meshRef.current.clone();
    
    const exporter = new OBJExporter();
    const result = exporter.parse(meshClone);
    
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'imagin3d-model.obj';
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateSetting = useCallback(<K extends keyof ModelSettings>(key: K, value: ModelSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Imagin3D
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>Powered by Gemini 2.5</span>
            <div className="h-4 w-px bg-slate-700"></div>
            <a href="#" className="hover:text-indigo-400 transition-colors">Documentation</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-8rem)]">
          
          {/* Left Column: Input & Controls */}
          <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            
            {/* Upload Area */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-400" /> Source Image
              </h2>
              
              {!originalImage ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    <p className="mb-2 text-sm text-slate-400 text-center"><span className="font-semibold text-indigo-400">Click to upload</span></p>
                    <p className="text-xs text-slate-500">PNG, JPG (MAX. 5MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border border-slate-700 group">
                     <img src={originalImage} alt="Source" className="w-full h-auto object-cover" />
                     <button 
                        onClick={() => { setOriginalImage(null); setDepthMap(null); setStatus({status:'idle'}); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/80 rounded-full text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                     </button>
                  </div>
                  
                  <button
                    onClick={processImage}
                    disabled={status.status === 'processing'}
                    className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                        status.status === 'processing' 
                        ? 'bg-slate-700 text-slate-300 cursor-wait'
                        : depthMap && generationProgress === 100
                        ? 'bg-green-600/20 text-green-400 border border-green-600/50'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    }`}
                  >
                    {status.status === 'processing' ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> {status.message}</>
                    ) : depthMap && generationProgress < 100 ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Building Mesh {generationProgress}%</>
                    ) : depthMap && generationProgress === 100 ? (
                      <><Sparkles className="w-5 h-5" /> Mesh Ready</>
                    ) : (
                      <><Sparkles className="w-5 h-5" /> Generate 3D Mesh</>
                    )}
                  </button>
                  
                  {status.status === 'error' && (
                     <p className="text-xs text-red-400 text-center bg-red-900/20 p-2 rounded border border-red-900/50">
                        {status.message}
                     </p>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <Controls 
                settings={settings} 
                updateSetting={updateSetting} 
                onDownload={handleDownload}
                hasDepth={!!depthMap}
            />

            {depthMap && (
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 opacity-80">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Depth Data</h3>
                    <img src={depthMap} className="w-full rounded-lg border border-slate-700 opacity-75 hover:opacity-100 transition-opacity" />
                </div>
            )}
          </div>

          {/* Right Column: 3D Viewer */}
          <div className="lg:col-span-9 h-[500px] lg:h-full">
            {originalImage ? (
                <Viewer3D 
                    originalImage={originalImage} 
                    depthMap={depthMap} 
                    settings={settings} 
                    onMeshReady={(mesh) => { meshRef.current = mesh; }}
                    onProgress={setGenerationProgress}
                />
            ) : (
                <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-slate-500 space-y-4">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center animate-pulse">
                        <Box className="w-10 h-10 opacity-50" />
                    </div>
                    <p className="text-lg font-medium">Upload an image to start</p>
                    <p className="text-sm max-w-md text-center opacity-60">
                        Imagin3D uses advanced AI to estimate geometry from a single 2D photo, creating a clean 3D mesh you can export.
                    </p>
                </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;