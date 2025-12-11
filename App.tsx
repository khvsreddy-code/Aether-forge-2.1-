import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Loader2, Sparkles, Box, Terminal, Activity, Zap, Network, Globe, X, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Viewer3D } from './components/Viewer3D';
import { Controls } from './components/Controls';
import { generate3DModel } from './services/gemini';
import { GenerationState, ModelSettings, HistoryItem } from './types';

// Switched to Trellis as default for higher quality and reliability compared to TripoSR
const INITIAL_SETTINGS: ModelSettings = {
  model: 'Trellis',
  hfToken: '',
  wireframe: false,
  meshColor: '#6366f1', 
  autoRotate: true,
  environment: 'studio',
  showGrid: true,
  seed: 42
};

function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationState>({ status: 'idle' });
  const [settings, setSettings] = useState<ModelSettings>(INITIAL_SETTINGS);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setOriginalImage(event.target.result as string);
          // Don't reset modelUrl immediately if we want to compare, but standard UX is reset
          setModelUrl(null); 
          setStatus({ status: 'idle' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addToHistory = (url: string, image: string) => {
      const newItem: HistoryItem = {
          id: Date.now().toString(),
          modelUrl: url,
          thumbnail: image,
          modelType: settings.model,
          timestamp: Date.now()
      };
      setHistory(prev => [newItem, ...prev]);
  };

  const removeFromHistory = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setHistory(prev => prev.filter(item => item.id !== id));
      if (history.length <= 1) {
          setShowHistory(false);
      }
  };

  const processImage = async () => {
    if (!originalImage) return;

    setStatus({ status: 'processing', message: `INITIALIZING ${settings.model} CONNECTION...` });
    
    try {
        const url = await generate3DModel(
            originalImage, 
            settings.hfToken, 
            settings.model,
            settings.seed,
            (msg) => setStatus(prev => ({ ...prev, message: msg }))
        );
        setModelUrl(url);
        addToHistory(url, originalImage);
        setStatus({ status: 'success', message: 'ASSET GENERATED' });
    } catch (error: any) {
      console.error(error);
      setStatus({ status: 'error', message: error.message || 'INFERENCE FAILED' });
    }
  };

  const handleDownload = () => {
    if (modelUrl) {
        const link = document.createElement('a');
        link.href = modelUrl;
        link.download = `aetherforge_${settings.model}_${Date.now()}.glb`;
        link.click();
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
      setModelUrl(item.modelUrl);
      setOriginalImage(item.thumbnail);
      setSettings(prev => ({...prev, model: item.modelType}));
      setStatus({ status: 'success', message: 'LOADED FROM HISTORY' });
  };

  const updateSetting = useCallback(<K extends keyof ModelSettings>(key: K, value: ModelSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-transparent text-indigo-50 selection:bg-indigo-500/30 selection:text-white font-sans">
      {/* HUD Header */}
      <header className="flex-none border-b border-indigo-900/50 bg-black/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10 flex items-center justify-center">
                 <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full animate-pulse"></div>
                 <Network className="w-8 h-8 text-indigo-400 relative z-10" />
            </div>
            <div className="flex flex-col">
                <h1 className="text-xl md:text-2xl font-cyber tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-600 font-bold uppercase drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                AETHERFORGE
                </h1>
                <span className="text-[0.6rem] tracking-[0.4em] text-indigo-500 uppercase flex items-center gap-2">
                   <span className={`w-1 h-1 rounded-full ${status.status === 'processing' ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></span>
                   OPEN SOURCE INFERENCE
                </span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm font-mono text-indigo-400">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 border-r border-indigo-900/50">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="hidden lg:inline">GPU_POOL: PUBLIC</span>
                <span className="lg:hidden">PUBLIC</span>
            </div>
            <div className="flex items-center gap-2 border border-indigo-500/30 px-3 py-1 bg-indigo-950/20 clip-corner-br">
                 <Globe className="w-3 h-3 text-blue-400" />
                 <span>SPACES</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable on mobile, Fixed on Desktop */}
      <main className="flex-1 overflow-hidden relative w-full max-w-7xl mx-auto">
        <div className="h-full flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-y-auto lg:overflow-hidden">
          
          {/* Left Column: Input & Controls - Scrollable */}
          <div className="w-full lg:w-1/3 flex-none flex flex-col gap-6 lg:h-full lg:overflow-y-auto custom-scrollbar pb-10 lg:pb-0">
            
            {/* Upload Area */}
            <div className="relative group shrink-0">
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-500"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-indigo-500"></div>

                <div className="bg-black/60 backdrop-blur-md p-6 border border-indigo-900/50 shadow-[0_0_30px_rgba(0,0,0,0.6)] clip-corners">
                <h2 className="text-lg font-cyber mb-4 text-indigo-300 flex items-center gap-2 uppercase tracking-wide border-b border-indigo-900/50 pb-2">
                    <Terminal className="w-5 h-5" /> Data Stream
                </h2>
                
                {!originalImage ? (
                    <label className="flex flex-col items-center justify-center w-full h-48 border border-dashed border-indigo-800 bg-indigo-950/10 cursor-pointer hover:border-indigo-400 hover:bg-indigo-900/20 transition-all group overflow-hidden relative">
                    <div className="absolute inset-0 bg-scanline opacity-10 pointer-events-none animate-scan"></div>
                    
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
                        <Upload className="w-10 h-10 mb-3 text-indigo-700 group-hover:text-indigo-400 transition-colors duration-300" />
                        <p className="mb-2 text-sm text-indigo-300 font-mono"><span className="font-bold border-b border-indigo-500">INITIATE_UPLOAD</span></p>
                        <p className="text-xs text-indigo-600">FORMAT: PNG / JPG</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                ) : (
                    <div className="space-y-4">
                        <div className="relative border border-indigo-700/50 group bg-black">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10"></div>
                            <img src={originalImage} alt="Source" className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            
                            <button 
                                onClick={() => { setOriginalImage(null); setModelUrl(null); setStatus({status:'idle'}); }}
                                className="absolute top-2 right-2 p-1 bg-red-900/80 hover:bg-red-600 border border-red-500 text-white z-30 clip-corner-br transition-all"
                            >
                            <X className="w-3 h-3" />
                            </button>
                        </div>
                        
                        <button
                            onClick={processImage}
                            disabled={status.status === 'processing'}
                            className={`w-full py-3 px-4 font-bold font-cyber uppercase tracking-wider flex items-center justify-center gap-2 transition-all border clip-corners relative overflow-hidden group ${
                                status.status === 'processing'
                                ? 'bg-indigo-950 border-indigo-800 text-indigo-700 cursor-wait'
                                : 'bg-indigo-600/20 border-indigo-500 text-indigo-300 hover:bg-indigo-500 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                            }`}
                        >
                            {status.status === 'processing' ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> {status.message || 'PROCESSING...'}</>
                            ) : (
                                <><Sparkles className="w-5 h-5" /> FORGE 3D MODEL</>
                            )}
                            
                            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 group-hover:animate-shine" />
                        </button>
                        
                        {status.status === 'error' && (
                            <div className="text-[10px] text-red-300 font-mono border border-red-900 bg-red-950/50 p-3 space-y-2">
                                <div className="flex items-center gap-2 text-red-400 font-bold border-b border-red-900/50 pb-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    SYSTEM ERROR
                                </div>
                                <p className="break-words opacity-80">{status.message}</p>
                                {status.message?.includes("Token") && (
                                    <p className="text-indigo-300">Tip: Add a HF Token below to bypass public queues.</p>
                                )}
                                <button 
                                    onClick={processImage} 
                                    className="w-full mt-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 py-1 flex items-center justify-center gap-1 uppercase text-[10px] tracking-wider border border-red-800"
                                >
                                    <RefreshCw className="w-3 h-3" /> Retry Protocol
                                </button>
                            </div>
                        )}
                        {status.status === 'processing' && (
                            <p className="text-[10px] text-indigo-400 font-mono animate-pulse border-l-2 border-indigo-500 pl-2">
                                {status.message}
                            </p>
                        )}
                    </div>
                )}
                </div>
            </div>

            {/* Controls */}
            <Controls 
                settings={settings} 
                updateSetting={updateSetting} 
                onDownload={handleDownload}
                hasModel={!!modelUrl}
                toggleHistory={() => setShowHistory(prev => !prev)}
            />
          </div>

          {/* Right Column: 3D Viewer */}
          <div className="w-full lg:flex-1 h-[500px] lg:h-full relative group shrink-0">
             {/* Decorative Frames */}
             <div className="absolute inset-0 border border-indigo-900/20 pointer-events-none z-10"></div>
             <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-500 z-10"></div>
             <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-500 z-10"></div>
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-500 z-10"></div>
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-500 z-10"></div>
             
             {/* History Sidebar */}
             <div className={`absolute top-0 right-0 h-full w-64 bg-black/95 border-l border-indigo-900/50 z-30 transition-transform duration-300 transform ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
                 <div className="p-4 border-b border-indigo-900/50 flex items-center justify-between">
                     <h3 className="font-cyber text-sm text-indigo-300">SESSION HISTORY</h3>
                     <button onClick={() => setShowHistory(false)} className="text-indigo-500 hover:text-white"><X className="w-4 h-4" /></button>
                 </div>
                 <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-4rem)] custom-scrollbar">
                     {history.length === 0 ? (
                         <p className="text-[10px] text-indigo-600 font-mono text-center mt-10">NO ASSETS GENERATED YET</p>
                     ) : (
                         history.map(item => (
                             <div key={item.id} onClick={() => loadFromHistory(item)} className="group cursor-pointer relative">
                                 <div className="relative aspect-video bg-indigo-900/20 border border-indigo-900/50 overflow-hidden group-hover:border-indigo-400 transition-colors">
                                     <img src={item.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                     <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1">
                                         <p className="text-[10px] text-indigo-300 font-mono flex justify-between">
                                             <span>{item.modelType}</span>
                                             <span>{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                         </p>
                                     </div>
                                 </div>
                                 {/* Delete Button */}
                                 <button 
                                    onClick={(e) => removeFromHistory(e, item.id)}
                                    className="absolute -top-1 -right-1 p-1 bg-red-900 text-red-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 rounded-bl"
                                 >
                                     <Trash2 className="w-3 h-3" />
                                 </button>
                             </div>
                         ))
                     )}
                 </div>
             </div>

             {/* Main Viewer Area */}
            {modelUrl ? (
                <Viewer3D 
                    modelUrl={modelUrl} 
                    settings={settings} 
                />
            ) : (
                <div className="w-full h-full bg-black/40 backdrop-blur-sm border border-indigo-900/30 flex flex-col items-center justify-center text-indigo-800 space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-[80px] opacity-20 animate-pulse"></div>
                        <div className="w-40 h-40 border border-indigo-800/30 rounded-full flex items-center justify-center relative animate-[spin_15s_linear_infinite]">
                            <div className="w-32 h-32 border border-indigo-600/20 rounded-full border-dashed"></div>
                        </div>
                        <Box className="w-16 h-16 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" style={{animationDuration: '3s'}} />
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-cyber text-indigo-500/50 tracking-[0.2em] mb-2">AETHERFORGE</p>
                        <p className="text-sm font-mono text-indigo-700 max-w-md mx-auto uppercase">
                            Awaiting Inference Command
                        </p>
                    </div>
                </div>
            )}
          </div>

        </div>
      </main>
      
      <footer className="flex-none border-t border-indigo-900/30 bg-black/90 py-1 px-4 text-[10px] font-mono text-indigo-700 flex justify-between uppercase z-50">
        <div>STATUS: ONLINE</div>
        <div className="flex gap-4">
            <span>MODEL: {settings.model}</span>
            <span>BACKEND: HF_GRADIO</span>
        </div>
      </footer>
    </div>
  );
}

export default App;