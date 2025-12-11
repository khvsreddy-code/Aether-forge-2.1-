import React from 'react';
import { ModelSettings, NeuralModel, EnvironmentType } from '../types';
import { Cpu, RotateCw, Key, Download, Network, Database, Layers, Sun, Grid3X3, History, Dna } from 'lucide-react';

interface ControlsProps {
  settings: ModelSettings;
  updateSetting: <K extends keyof ModelSettings>(key: K, value: ModelSettings[K]) => void;
  onDownload: () => void;
  hasModel: boolean;
  toggleHistory: () => void;
}

const MODELS: {id: NeuralModel, name: string, desc: string, isFree: boolean}[] = [
  { id: 'Trellis', name: 'Trellis', desc: 'Microsoft | Geometry', isFree: true },
  { id: 'Hunyuan3D', name: 'Hunyuan3D 2.1', desc: 'Tencent | High Fidelity', isFree: true },
  { id: 'StableFast3D', name: 'StableFast3D', desc: 'Stability AI | Ultra Fast', isFree: true },
  { id: 'TripoSR', name: 'TripoSR', desc: 'Stability AI | Fast', isFree: true },
  { id: 'InstantMesh', name: 'InstantMesh', desc: 'Tencent ARC | HQ', isFree: true },
];

const ENVIRONMENTS: {id: EnvironmentType, name: string}[] = [
    { id: 'studio', name: 'Studio Dark' },
    { id: 'city', name: 'Cyber City' },
    { id: 'sunset', name: 'Sunset' },
    { id: 'dawn', name: 'Dawn' },
    { id: 'night', name: 'Night' },
];

export const Controls: React.FC<ControlsProps> = ({ settings, updateSetting, onDownload, hasModel, toggleHistory }) => {
  return (
    <div className="bg-black/80 backdrop-blur-md p-6 border border-indigo-500/30 clip-hex relative flex flex-col gap-5">
      
      <div className="flex items-center justify-between border-b border-indigo-900/50 pb-2">
        <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h2 className="text-md font-cyber text-indigo-100 tracking-wider uppercase">Config</h2>
        </div>
        <button onClick={toggleHistory} className="text-xs text-indigo-400 hover:text-white flex items-center gap-1">
            <History className="w-3 h-3" /> HISTORY
        </button>
      </div>

      {/* Model Selector */}
      <div className="space-y-2">
         <label className="text-[10px] font-mono text-indigo-400 flex items-center gap-2 uppercase">
             <Network className="w-3 h-3" /> Neural Model
         </label>
         <div className="grid grid-cols-1 gap-2">
            <select 
                value={settings.model}
                onChange={(e) => updateSetting('model', e.target.value as NeuralModel)}
                className="w-full bg-indigo-950/30 border border-indigo-600/50 text-indigo-100 text-xs font-mono p-2 rounded-none focus:outline-none focus:border-indigo-400 uppercase cursor-pointer"
            >
                {MODELS.map(m => (
                    <option key={m.id} value={m.id} className="bg-black">
                        {m.name}
                    </option>
                ))}
            </select>
            <div className="flex items-center gap-2 text-[10px] text-indigo-400/60 font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                {MODELS.find(m => m.id === settings.model)?.desc}
            </div>
         </div>
      </div>

      {/* Seed Input (Visible for diffusion-based models) */}
      {(settings.model === 'Trellis' || settings.model === 'Hunyuan3D') && (
        <div className="space-y-2">
           <label className="text-[10px] font-mono text-indigo-400 flex items-center gap-2 uppercase">
               <Dna className="w-3 h-3" /> Random Seed
           </label>
           <input 
              type="number" 
              value={settings.seed}
              onChange={(e) => updateSetting('seed', parseInt(e.target.value) || 0)}
              className="w-full bg-indigo-950/30 border border-indigo-600/50 text-indigo-100 text-xs font-mono p-2 focus:border-indigo-400 outline-none"
           />
        </div>
      )}

      {/* Environment Selector */}
      <div className="space-y-2">
         <label className="text-[10px] font-mono text-indigo-400 flex items-center gap-2 uppercase">
             <Sun className="w-3 h-3" /> Lighting Env
         </label>
         <select 
            value={settings.environment}
            onChange={(e) => updateSetting('environment', e.target.value as EnvironmentType)}
            className="w-full bg-indigo-950/30 border border-indigo-600/50 text-indigo-100 text-xs font-mono p-2 rounded-none focus:outline-none focus:border-indigo-400 uppercase cursor-pointer"
        >
            {ENVIRONMENTS.map(e => (
                <option key={e.id} value={e.id} className="bg-black">{e.name}</option>
            ))}
        </select>
      </div>

      {/* Toggles Grid */}
      <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={() => updateSetting('wireframe', !settings.wireframe)}
            className={`flex items-center justify-center gap-2 p-2 text-[10px] border ${settings.wireframe ? 'bg-indigo-600/20 border-indigo-400 text-white' : 'bg-transparent border-indigo-900 text-indigo-500'}`}
          >
              <Layers className="w-3 h-3" /> WIREFRAME
          </button>
          <button
            onClick={() => updateSetting('showGrid', !settings.showGrid)}
            className={`flex items-center justify-center gap-2 p-2 text-[10px] border ${settings.showGrid ? 'bg-indigo-600/20 border-indigo-400 text-white' : 'bg-transparent border-indigo-900 text-indigo-500'}`}
          >
              <Grid3X3 className="w-3 h-3" /> GRID
          </button>
      </div>

      {/* HF Token Input */}
      <div className="space-y-2 pt-2 border-t border-indigo-900/30">
        <label className="text-[10px] font-mono text-indigo-400 flex items-center justify-between uppercase">
             <div className="flex items-center gap-2"><Key className="w-3 h-3" /> HF Token (Optional)</div>
             {settings.hfToken.length > 5 && <span className="text-green-500">ACTIVE</span>}
         </label>
         <input 
            type="password" 
            placeholder="hf_..."
            value={settings.hfToken}
            onChange={(e) => updateSetting('hfToken', e.target.value)}
            className="w-full bg-black/50 border border-indigo-800 text-indigo-200 text-xs p-2 focus:border-indigo-400 outline-none font-mono tracking-tighter"
         />
      </div>

      <div className="pt-4 mt-auto">
        <button
            onClick={onDownload}
            disabled={!hasModel}
            className={`w-full py-3 px-4 font-cyber text-sm uppercase tracking-widest flex justify-center items-center gap-2 transition-all border clip-corners ${
                !hasModel 
                ? 'bg-black/50 text-indigo-900 border-indigo-900 cursor-not-allowed' 
                : 'bg-indigo-600/20 text-indigo-300 border-indigo-500 hover:bg-indigo-500 hover:text-white hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]'
            }`}
        >
            <Download className="w-4 h-4" />
            DOWNLOAD .GLB
        </button>
      </div>
    </div>
  );
};