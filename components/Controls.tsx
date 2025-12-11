import React from 'react';
import { ModelSettings, NeuralModel } from '../types';
import { Sliders, Cpu, Layers, Droplet, Download, Hexagon, Network } from 'lucide-react';

interface ControlsProps {
  settings: ModelSettings;
  updateSetting: <K extends keyof ModelSettings>(key: K, value: ModelSettings[K]) => void;
  onDownload: () => void;
  hasDepth: boolean;
}

const MODELS: {id: NeuralModel, name: string, desc: string}[] = [
  { id: 'TripoSR', name: 'TripoSR', desc: 'Fast Inference / Game Ready' },
  { id: 'Trellis', name: 'Trellis', desc: 'Structured / Editable' },
  { id: 'InstantMesh', name: 'InstantMesh', desc: 'Rapid Prototyping' },
  { id: 'Hunyuan3D', name: 'Hunyuan3D', desc: 'High Fidelity / Texture' },
  { id: 'Point-E', name: 'Point-E', desc: 'Volumetric Cloud' },
  { id: 'DreamFusion', name: 'DreamFusion', desc: 'NeRF / Organic' },
  { id: 'StableDiffusion3D', name: 'SD-3D', desc: 'Multi-view Diffusion' },
  { id: '3DTopia', name: '3DTopia', desc: 'Hybrid Pipeline' },
];

export const Controls: React.FC<ControlsProps> = ({ settings, updateSetting, onDownload, hasDepth }) => {
  return (
    <div className="bg-black/60 backdrop-blur-md p-6 border border-indigo-500/30 shadow-[0_0_20px_rgba(0,0,0,0.5)] clip-hex relative overflow-hidden">
      {/* Decorative Scanline */}
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/50"></div>

      <div className="flex items-center gap-2 mb-6 border-b border-indigo-900/50 pb-2">
        <Cpu className="w-4 h-4 text-indigo-400" />
        <h2 className="text-md font-cyber text-indigo-100 tracking-wider uppercase">Engine Config</h2>
      </div>

      {/* Model Selector */}
      <div className="space-y-3 mb-6">
         <label className="text-xs font-mono text-indigo-400 flex items-center gap-2 uppercase">
             <Network className="w-3 h-3" /> Neural_Architecture
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
            <div className="text-[10px] text-indigo-400/60 font-mono pl-1 border-l border-indigo-800">
                {MODELS.find(m => m.id === settings.model)?.desc}
            </div>
         </div>
      </div>

      {/* Displacement Control */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-xs font-mono text-indigo-400 uppercase">
          <label className="flex items-center gap-2">
             <Layers className="w-3 h-3" /> Z_Displacement
          </label>
          <span className="text-white">{settings.displacementScale.toFixed(1)}</span>
        </div>
        <div className="relative h-2 bg-black rounded-none border border-indigo-900 overflow-hidden">
             <div className="absolute top-0 left-0 h-full bg-indigo-500" style={{ width: `${(settings.displacementScale / 5) * 100}%` }}></div>
             <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                disabled={!hasDepth}
                value={settings.displacementScale}
                onChange={(e) => updateSetting('displacementScale', parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
        </div>
        {!hasDepth && <p className="text-[10px] text-amber-600/80 font-mono">>> WARN: NO GEOMETRY</p>}
      </div>

      {/* Material Controls */}
      <div className="space-y-4 mb-6">
        <h3 className="text-xs font-mono text-indigo-500 uppercase mb-2 border-l-2 border-indigo-800 pl-2">Material_Shader</h3>
        
        <div className="space-y-2">
             <div className="flex justify-between text-xs font-mono text-indigo-400">
              <label>ROUGHNESS</label>
              <span className="text-white">{settings.roughness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.roughness}
              onChange={(e) => updateSetting('roughness', parseFloat(e.target.value))}
              className="w-full h-1 bg-black appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:rounded-none"
            />
        </div>

        <div className="space-y-2">
             <div className="flex justify-between text-xs font-mono text-indigo-400">
              <label>METALNESS</label>
              <span className="text-white">{settings.metalness.toFixed(2)}</span>
            </div>
             <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.metalness}
              onChange={(e) => updateSetting('metalness', parseFloat(e.target.value))}
              className="w-full h-1 bg-black appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:rounded-none"
            />
        </div>
      </div>

      {/* Wireframe Toggle */}
      <div className="mb-6 flex items-center justify-between border border-indigo-900/30 p-2 bg-indigo-950/10">
        <label className="text-xs font-mono text-indigo-300 flex items-center gap-2 cursor-pointer uppercase">
          <Hexagon className="w-3 h-3" /> Topology_View
        </label>
        <button
          onClick={() => updateSetting('wireframe', !settings.wireframe)}
          className={`w-8 h-4 border transition-all duration-200 relative ${
            settings.wireframe ? 'bg-indigo-900/50 border-indigo-400' : 'bg-transparent border-indigo-900'
          }`}
        >
          <div
            className={`absolute top-0.5 bottom-0.5 w-3 bg-indigo-400 transition-all duration-200 ${
              settings.wireframe ? 'right-0.5' : 'left-0.5 opacity-50'
            }`}
          />
        </button>
      </div>

       {settings.wireframe && (
         <div className="space-y-2 mb-6 animate-fadeIn">
            <label className="text-xs font-mono text-indigo-400 flex items-center gap-2 uppercase">
                <Droplet className="w-3 h-3" /> Grid_Color
            </label>
            <div className="flex gap-2">
                {['#00f3ff', '#ff00ff', '#6366f1', '#10b981', '#ffffff'].map(c => (
                    <button 
                        key={c}
                        onClick={() => updateSetting('meshColor', c)}
                        className={`w-6 h-6 border ${settings.meshColor === c ? 'border-white shadow-[0_0_8px_white]' : 'border-transparent opacity-50'} hover:opacity-100 transition-all`}
                        style={{ backgroundColor: c, boxShadow: settings.meshColor === c ? `0 0 10px ${c}` : 'none' }}
                    />
                ))}
            </div>
         </div>
       )}

      <div className="pt-4 border-t border-indigo-900/50">
        <button
            onClick={onDownload}
            disabled={!hasDepth}
            className={`w-full py-3 px-4 font-cyber text-sm uppercase tracking-widest flex justify-center items-center gap-2 transition-all border clip-corners ${
                !hasDepth 
                ? 'bg-black/50 text-indigo-900 border-indigo-900 cursor-not-allowed' 
                : 'bg-indigo-600/20 text-indigo-300 border-indigo-500 hover:bg-indigo-500 hover:text-white hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]'
            }`}
        >
            <Download className="w-4 h-4" />
            EXPORT .GLB
        </button>
      </div>
    </div>
  );
};