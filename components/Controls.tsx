import React from 'react';
import { ModelSettings, NeuralModel } from '../types';
import { Cpu, RotateCw, Key, Download, Network, Box } from 'lucide-react';

interface ControlsProps {
  settings: ModelSettings;
  updateSetting: <K extends keyof ModelSettings>(key: K, value: ModelSettings[K]) => void;
  onDownload: () => void;
  hasModel: boolean;
}

const MODELS: {id: NeuralModel, name: string, desc: string}[] = [
  { id: 'TripoSR', name: 'TripoSR', desc: 'Fastest / Game Ready (API)' },
  { id: 'Trellis', name: 'Trellis', desc: 'Structured Geometry' },
  { id: 'InstantMesh', name: 'InstantMesh', desc: 'Rapid Prototyping' },
  { id: 'Hunyuan3D', name: 'Hunyuan3D', desc: 'High Fidelity' },
  { id: 'Point-E', name: 'Point-E', desc: 'Point Cloud' },
];

export const Controls: React.FC<ControlsProps> = ({ settings, updateSetting, onDownload, hasModel }) => {
  return (
    <div className="bg-black/80 backdrop-blur-md p-6 border border-indigo-500/30 clip-hex relative overflow-hidden flex flex-col gap-6">
      
      <div className="flex items-center gap-2 border-b border-indigo-900/50 pb-2">
        <Cpu className="w-4 h-4 text-indigo-400" />
        <h2 className="text-md font-cyber text-indigo-100 tracking-wider uppercase">Inference Config</h2>
      </div>

      {/* Model Selector */}
      <div className="space-y-3">
         <label className="text-xs font-mono text-indigo-400 flex items-center gap-2 uppercase">
             <Network className="w-3 h-3" /> Target_Model
         </label>
         <div className="grid grid-cols-1 gap-2">
            <select 
                value={settings.model}
                onChange={(e) => updateSetting('model', e.target.value as NeuralModel)}
                className="w-full bg-indigo-950/30 border border-indigo-600/50 text-indigo-100 text-xs font-mono p-2 rounded-none focus:outline-none focus:border-indigo-400 uppercase cursor-pointer"
            >
                {MODELS.map(m => (
                    <option key={m.id} value={m.id} className="bg-black">{m.name}</option>
                ))}
            </select>
            <div className="text-[10px] text-indigo-400/60 font-mono">
                {MODELS.find(m => m.id === settings.model)?.desc}
            </div>
         </div>
      </div>

      {/* API Key Input */}
      <div className="space-y-3">
        <label className="text-xs font-mono text-indigo-400 flex items-center gap-2 uppercase">
             <Key className="w-3 h-3" /> API_Credential
         </label>
         <input 
            type="password" 
            placeholder="sk-..."
            value={settings.apiKey}
            onChange={(e) => updateSetting('apiKey', e.target.value)}
            className="w-full bg-black/50 border border-indigo-800 text-indigo-200 text-xs p-2 focus:border-indigo-400 outline-none font-mono tracking-tighter"
         />
         <p className="text-[9px] text-gray-500">
             *Required for real inference. Get key at {settings.model === 'TripoSR' ? 'platform.tripo3d.ai' : 'provider dashboard'}
         </p>
      </div>

      {/* Viewer Options */}
      <div className="space-y-3 pt-4 border-t border-indigo-900/30">
        <div className="flex items-center justify-between">
            <label className="text-xs font-mono text-indigo-300 flex items-center gap-2 cursor-pointer uppercase">
            <RotateCw className="w-3 h-3" /> Auto_Turntable
            </label>
            <button
            onClick={() => updateSetting('autoRotate', !settings.autoRotate)}
            className={`w-8 h-4 border transition-all duration-200 relative ${
                settings.autoRotate ? 'bg-indigo-900/50 border-indigo-400' : 'bg-transparent border-indigo-900'
            }`}
            >
            <div className={`absolute top-0.5 bottom-0.5 w-3 bg-indigo-400 transition-all duration-200 ${
                settings.autoRotate ? 'right-0.5' : 'left-0.5 opacity-50'
            }`} />
            </button>
        </div>
      </div>

      <div className="pt-4 border-t border-indigo-900/50 mt-auto">
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
