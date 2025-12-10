import React from 'react';
import { ModelSettings } from '../types';
import { Sliders, Box, Layers, Droplet, Download } from 'lucide-react';

interface ControlsProps {
  settings: ModelSettings;
  updateSetting: <K extends keyof ModelSettings>(key: K, value: ModelSettings[K]) => void;
  onDownload: () => void;
  hasDepth: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ settings, updateSetting, onDownload, hasDepth }) => {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6 h-fit">
      <div className="flex items-center gap-2 mb-4">
        <Sliders className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-semibold text-white">Model Settings</h2>
      </div>

      {/* Displacement Control */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <label className="text-slate-300 flex items-center gap-2">
             <Layers className="w-4 h-4" /> Depth Amplitude
          </label>
          <span className="text-slate-400 font-mono">{settings.displacementScale.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          disabled={!hasDepth}
          value={settings.displacementScale}
          onChange={(e) => updateSetting('displacementScale', parseFloat(e.target.value))}
          className={`w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 ${!hasDepth ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {!hasDepth && <p className="text-xs text-amber-500">Generate a 3D model to enable depth scaling.</p>}
      </div>

      {/* Material Controls */}
      <div className="space-y-4 pt-4 border-t border-slate-700">
        <h3 className="text-sm font-medium text-slate-400">Material Props</h3>
        
        <div className="space-y-2">
             <div className="flex justify-between text-sm">
              <label className="text-slate-300">Roughness</label>
              <span className="text-slate-400 font-mono">{settings.roughness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.roughness}
              onChange={(e) => updateSetting('roughness', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
        </div>

        <div className="space-y-2">
             <div className="flex justify-between text-sm">
              <label className="text-slate-300">Metalness</label>
              <span className="text-slate-400 font-mono">{settings.metalness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.metalness}
              onChange={(e) => updateSetting('metalness', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
        </div>
      </div>

      {/* Wireframe Toggle */}
      <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
        <label className="text-slate-300 flex items-center gap-2 cursor-pointer">
          <Box className="w-4 h-4" /> Wireframe Mode
        </label>
        <button
          onClick={() => updateSetting('wireframe', !settings.wireframe)}
          className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${
            settings.wireframe ? 'bg-indigo-600' : 'bg-slate-600'
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
              settings.wireframe ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

       {settings.wireframe && (
         <div className="space-y-2">
            <label className="text-sm text-slate-300 flex items-center gap-2">
                <Droplet className="w-4 h-4" /> Wireframe Color
            </label>
            <div className="flex gap-2">
                {['#ffffff', '#6366f1', '#10b981', '#f59e0b', '#ef4444'].map(c => (
                    <button 
                        key={c}
                        onClick={() => updateSetting('meshColor', c)}
                        className={`w-6 h-6 rounded-full border-2 ${settings.meshColor === c ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>
         </div>
       )}

      <div className="pt-6 border-t border-slate-700">
        <button
            onClick={onDownload}
            disabled={!hasDepth}
            className={`w-full py-2 px-4 rounded-lg font-medium text-sm flex justify-center items-center gap-2 transition-all ${
                !hasDepth 
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
            }`}
        >
            <Download className="w-4 h-4" />
            Download .OBJ Model
        </button>
      </div>
    </div>
  );
};