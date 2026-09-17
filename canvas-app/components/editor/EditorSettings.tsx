/**
 * EditorSettings — Inline sidebar panel for editor preferences
 * Renders inside the left aside, same as Chat, Files, Git, etc.
 */
import React from 'react';
import { Type, Palette, Keyboard, ToggleLeft, ToggleRight, RotateCcw } from 'lucide-react';
import { useEditorSettingsStore } from '../../stores/editorStore';

const EditorSettingsPanel: React.FC = () => {
  const settings = useEditorSettingsStore((s) => s.settings);
  const updateSettings = useEditorSettingsStore((s) => s.updateSettings);
  const resetSettings = useEditorSettingsStore((s) => s.resetSettings);

  const Toggle: React.FC<{ label: string; description: string; value: boolean; onChange: (v: boolean) => void }> = ({
    label, description, value, onChange,
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-canvas-border last:border-0">
      <div>
        <p className="text-xs font-medium text-gray-200">{label}</p>
        <p className="text-[10px] text-canvas-muted-deep mt-0.5">{description}</p>
      </div>
      <button onClick={() => onChange(!value)} className="transition-colors">
        {value ? (
          <ToggleRight className="w-7 h-7 text-primary-400" />
        ) : (
          <ToggleLeft className="w-7 h-7 text-gray-600" />
        )}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        <div className="space-y-6">
          {/* Font Settings */}
          <div>
            <h3 className="text-xs font-bold text-canvas-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              <Type className="w-3.5 h-3.5" /> Typography
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-canvas-text">Font Size</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateSettings({ fontSize: Math.max(10, settings.fontSize - 1) })}
                    className="w-7 h-7 rounded-lg bg-white/[0.04] border border-canvas-border text-canvas-muted hover:text-white hover:bg-white/[0.08] transition-all text-xs font-bold"
                  >
                    −
                  </button>
                  <span className="text-xs text-white font-mono w-8 text-center">{settings.fontSize}</span>
                  <button
                    onClick={() => updateSettings({ fontSize: Math.min(28, settings.fontSize + 1) })}
                    className="w-7 h-7 rounded-lg bg-white/[0.04] border border-canvas-border text-canvas-muted hover:text-white hover:bg-white/[0.08] transition-all text-xs font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-canvas-text">Tab Size</span>
                <div className="flex items-center gap-1">
                  {[2, 4, 8].map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSettings({ tabSize: size })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${settings.tabSize === size
                          ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                          : 'bg-white/[0.04] text-canvas-muted-deep border border-canvas-border hover:text-canvas-text'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-canvas-text">Word Wrap</span>
                <div className="flex items-center gap-1">
                  {['on', 'off'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateSettings({ wordWrap: mode as 'on' | 'off' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${settings.wordWrap === mode
                          ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                          : 'bg-white/[0.04] text-canvas-muted-deep border border-canvas-border hover:text-canvas-text'
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div>
            <h3 className="text-xs font-bold text-canvas-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" /> Display
            </h3>
            <div>
              <Toggle
                label="Minimap"
                description="Show code overview on the right side"
                value={settings.minimap}
                onChange={(v) => updateSettings({ minimap: v })}
              />
              <Toggle
                label="Bracket Pair Colorization"
                description="Color-code matching brackets"
                value={settings.bracketPairColorization}
                onChange={(v) => updateSettings({ bracketPairColorization: v })}
              />
              <Toggle
                label="Line Numbers"
                description="Show line numbers in the gutter"
                value={settings.lineNumbers === 'on'}
                onChange={(v) => updateSettings({ lineNumbers: v ? 'on' : 'off' })}
              />
            </div>
          </div>

          {/* Auto-save Settings */}
          <div>
            <h3 className="text-xs font-bold text-canvas-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              <Keyboard className="w-3.5 h-3.5" /> Behavior
            </h3>
            <div>
              <Toggle
                label="Auto Save"
                description="Automatically save changes after a delay"
                value={settings.autoSave}
                onChange={(v) => updateSettings({ autoSave: v })}
              />
              <Toggle
                label="Format on Save"
                description="Format code when saving"
                value={settings.formatOnSave}
                onChange={(v) => updateSettings({ formatOnSave: v })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-canvas-border flex items-center justify-end gap-2 bg-white/[0.02] shrink-0">
        <button
          onClick={() => { resetSettings(); }}
          className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] text-white/50 hover:text-white/80 hover:bg-white/5 flex items-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
        </button>
      </div>
    </div>
  );
};

export default EditorSettingsPanel;
