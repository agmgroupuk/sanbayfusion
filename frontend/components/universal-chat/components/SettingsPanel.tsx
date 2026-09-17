
import React from 'react';
import { Settings, Sliders, Cpu, RefreshCw, Zap } from 'lucide-react';
import { SettingsState } from '../types';
import { NEURAL_PRESETS } from '../constants';

interface SettingsPanelProps {
  settings: SettingsState;
  onChange: (settings: SettingsState) => void;
  onApplyPreset: (type: string) => void;
  onReset: () => void;
  isOpen: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, onApplyPreset, onReset, isOpen }) => {
  // Determine which preset is currently active (if any)
  const activePreset = Object.entries(NEURAL_PRESETS).find(
    ([, p]) => p.prompt === settings.customPrompt && p.temp === settings.temperature
  )?.[0];

  return (
    <aside className={`absolute top-0 right-0 h-full w-[85%] sm:w-72 md:w-80 bg-[#0a0a0a]/98 backdrop-blur-xl border-l border-gray-800/50 p-5 transition-transform duration-500 ease-out z-[55] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center gap-3 mb-6 border-b border-gray-900 pb-4">
        <Settings size={18} className="text-cyan-500" />
        <h2 className="text-cyan-400 font-bold glow-cyan uppercase tracking-tighter text-sm font-mono">
          NEURAL_CONFIG
        </h2>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar space-y-8 text-xs font-mono pr-1">
        {/* Runtime Status */}
        <div className="p-4 bg-cyan-950/10 border border-cyan-500/20 rounded-lg space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={12} className="text-cyan-400" />
            <h3 className="text-cyan-500 font-bold uppercase tracking-widest text-[9px]">Engine State</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-2 text-[9px]">
            <span className="text-gray-600 uppercase">Status:</span>
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              ACTIVE
            </span>
            <span className="text-gray-600 uppercase">Context:</span> <span className="text-gray-300">{(settings.maxTokens / 1024).toFixed(1)}k PKTS</span>
            <span className="text-gray-600 uppercase">Volatility:</span> <span className="text-gray-300">{settings.temperature}</span>
            <span className="text-gray-600 uppercase">Mode:</span> <span className="text-gray-300">{settings.workspaceMode}</span>
          </div>
        </div>

        {/* Persona / System Prompt */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-green-500 font-bold uppercase text-[9px] tracking-widest">System Directive</h3>
            <span className="text-[8px] text-gray-700">EDITABLE</span>
          </div>
          <textarea
            value={settings.customPrompt}
            onChange={(e) => onChange({ ...settings, customPrompt: e.target.value })}
            rows={5}
            className="w-full bg-black/60 border border-gray-800 rounded-lg p-3 text-gray-400 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 resize-none text-[10px] leading-relaxed transition-all"
            placeholder="Input system instructions..."
          />
        </div>

        {/* Neural Presets */}
        <div className="space-y-3">
          <h3 className="text-yellow-500 font-bold uppercase text-[9px] tracking-widest">Quick Presets</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(NEURAL_PRESETS).map(t => (
              <button
                key={t}
                onClick={() => onApplyPreset(t)}
                className={`text-[9px] uppercase p-2.5 rounded border transition-all font-bold tracking-wider ${activePreset === t
                    ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300'
                    : 'border-gray-800 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-gray-600 hover:text-cyan-300'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Precision Sliders */}
        <div className="space-y-6 pt-2">
          <div className="flex flex-col space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-gray-500 uppercase text-[9px] tracking-widest flex items-center gap-2">
                <Sliders size={10} /> Volatility
              </label>
              <span className="text-cyan-400 font-bold tabular-nums">{settings.temperature}</span>
            </div>
            <input
              type="range"
              min="0" max="2" step="0.1"
              value={settings.temperature}
              onChange={(e) => onChange({ ...settings, temperature: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-gray-500 uppercase text-[9px] tracking-widest flex items-center gap-2">
                <Zap size={10} /> Output Limit
              </label>
              <span className="text-emerald-400 font-bold text-[9px] tracking-wider">AUTO</span>
            </div>
            <div className="p-2.5 bg-emerald-950/10 border border-emerald-500/15 rounded text-[8px] text-gray-500 leading-relaxed">
              Each provider&apos;s native max is used automatically. If a response hits the limit, another provider continues seamlessly.
            </div>
          </div>
        </div>

        {/* Agent Name / Protocol ID */}
        <div className="space-y-4 pt-4 border-t border-gray-900">
          <div className="flex flex-col space-y-2">
            <label className="text-gray-700 uppercase text-[9px] tracking-widest">Agent Name</label>
            <input
              type="text"
              value={settings.agentName}
              onChange={(e) => onChange({ ...settings, agentName: e.target.value })}
              className="bg-black border border-gray-800 rounded p-2 text-gray-400 focus:border-green-500/50 outline-none text-[10px] uppercase font-bold tracking-widest"
            />
          </div>
        </div>
      </div>

      <button
        onClick={onReset}
        className="mt-8 w-full p-4 rounded-lg border border-red-900/30 bg-red-950/10 hover:bg-red-900/20 text-red-500 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group"
      >
        <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
        Factory Wipe
      </button>
    </aside>
  );
};

export default SettingsPanel;
