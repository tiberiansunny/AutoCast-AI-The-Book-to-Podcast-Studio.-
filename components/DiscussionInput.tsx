
import React from 'react';
import { DiscussionEntry, CtaFile } from '../types';
import { EMOTIONS, CODECS, VOICE_PROFILES } from '../config';
import { getProfile } from '../utils';
import { IconPlus, IconImage, IconTrash, IconPlay, IconStop } from './Icons';

interface DiscussionInputProps {
  index: number;
  entry: DiscussionEntry;
  language: string;
  ctaFiles: CtaFile[];
  onUpdate: (id: string, field: keyof any, value: any) => void;
  onPreviewVoice: (id: string) => void;
  previewStatus: { id: string, state: 'loading' | 'playing' } | null;
  disabled?: boolean;
}

export const DiscussionInput: React.FC<DiscussionInputProps> = ({
  index, entry, language, ctaFiles, onUpdate, onPreviewVoice, previewStatus, disabled
}) => {
  const hostProfile = getProfile(entry.hostVoiceId);
  const isHostPreviewing = previewStatus?.id === entry.hostVoiceId;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpdate(entry.id, 'videoImage', e.target.files[0]);
    }
    e.target.value = '';
  };

  const toggleGuest = (voiceId: string) => {
      const current = entry.guestVoiceIds;
      if (current.includes(voiceId)) {
          onUpdate(entry.id, 'guestVoiceIds', current.filter(id => id !== voiceId));
      } else {
          onUpdate(entry.id, 'guestVoiceIds', [...current, voiceId]);
      }
  };

  return (
    <div className={`p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start ${disabled ? 'opacity-75 pointer-events-none grayscale-[0.2]' : ''}`}>
        <div className="md:col-span-1 flex justify-center pt-2">
          <span className="w-8 h-8 rounded-full bg-cyan-900 text-cyan-200 font-bold text-sm flex items-center justify-center">D{index + 1}</span>
        </div>
        
        <div className="md:col-span-11 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Discussion Topic</label>
                <textarea 
                    value={entry.topic}
                    disabled={disabled}
                    placeholder="e.g. The impact of AI on creative industries..."
                    onChange={(e) => onUpdate(entry.id, 'topic', e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:border-indigo-500 outline-none resize-none"
                />
            </div>
            
            {/* Host Selection */}
            <div>
                <div className="flex justify-between mb-1">
                     <label className="block text-xs text-slate-500 font-bold uppercase">Host</label>
                </div>
                <div className="flex gap-2">
                    <div className="relative group flex-grow">
                        <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 cursor-pointer hover:border-indigo-500 h-full">
                            <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${hostProfile.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`} alt="av" className="w-8 h-8 rounded-full bg-slate-800"/>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-white truncate">{hostProfile.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">{hostProfile.gender} • {hostProfile.age}</div>
                            </div>
                            <select 
                                value={entry.hostVoiceId}
                                disabled={disabled}
                                onChange={(e) => onUpdate(entry.id, 'hostVoiceId', e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer bg-slate-900 text-white"
                            >
                                {VOICE_PROFILES.map(p => (
                                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                                    {p.name} ({p.gender})
                                </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onPreviewVoice(entry.hostVoiceId); }}
                        className="bg-slate-800 border border-slate-700 rounded px-2 hover:bg-slate-700 text-slate-300 pointer-events-auto"
                    >
                        {isHostPreviewing && previewStatus?.state === 'playing' ? <IconStop /> : <IconPlay />}
                    </button>
                </div>
            </div>

            {/* Config */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Duration (min)</label>
                    <input 
                        type="number" min={1} max={60}
                        value={entry.durationMinutes}
                        disabled={disabled}
                        onChange={(e) => onUpdate(entry.id, 'durationMinutes', parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 outline-none"
                    />
                </div>
                <div>
                     <label className="block text-xs text-slate-500 mb-1">Audio Tail</label>
                     <select value={entry.ctaId || ""} disabled={disabled} onChange={(e) => onUpdate(entry.id, 'ctaId', e.target.value || null)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-xs text-slate-200 outline-none">
                         <option value="">None</option>
                         {ctaFiles.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                     </select>
                </div>
            </div>

            {/* Guest Selection (Multi-Select) */}
            <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded p-3">
                <label className="block text-xs text-slate-500 font-bold uppercase mb-2">Select Guest Speakers (Click to toggle)</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {VOICE_PROFILES.filter(p => p.id !== entry.hostVoiceId).map(p => {
                        const isSelected = entry.guestVoiceIds.includes(p.id);
                        return (
                            <div 
                                key={p.id}
                                onClick={() => !disabled && toggleGuest(p.id)}
                                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer border transition-all select-none ${
                                    isSelected 
                                    ? 'bg-indigo-900/50 border-indigo-500 text-white' 
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                            >
                                <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${p.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`} className="w-4 h-4 rounded-full"/>
                                <span className="text-xs">{p.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Interaction Weight Slider */}
            <div className="md:col-span-2">
                 <div className="flex justify-between items-end mb-1">
                     <label className="block text-xs text-slate-500 mb-1 font-bold uppercase">Interaction Level (Naturalness)</label>
                     <span className="text-xs font-mono text-cyan-400 font-bold">{entry.interactionWeight} / 10</span>
                 </div>
                 <input 
                    type="range" min="1" max="10" step="1"
                    value={entry.interactionWeight}
                    disabled={disabled}
                    onChange={(e) => onUpdate(entry.id, 'interactionWeight', parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                 />
                 <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                     <span>Formal / Rigid</span>
                     <span>Balanced</span>
                     <span>NotebookLM (Chaotic)</span>
                 </div>
            </div>

            <div className="md:col-span-2">
                 <label className="block text-xs text-slate-500 mb-1">Custom Rules (Optional)</label>
                 <textarea 
                    value={entry.rules}
                    disabled={disabled}
                    onChange={(e) => onUpdate(entry.id, 'rules', e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-300 outline-none resize-none"
                />
            </div>
        </div>

        {/* Video & Codec (Same as BookInput) */}
        <div className="md:col-span-1"></div>
        <div className="md:col-span-11 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
             <div className="flex items-center justify-between">
                <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Video Background</label>
                    <div className="flex items-center gap-3">
                        {entry.videoImage ? (
                            <div className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1 border border-slate-700">
                                <IconImage />
                                <span className="text-xs text-slate-200 truncate max-w-[150px]">{entry.videoImage.name}</span>
                                <button onClick={() => onUpdate(entry.id, 'videoImage', null)} disabled={disabled} className="text-slate-400 hover:text-red-400"><IconTrash /></button>
                            </div>
                        ) : (
                            <label className={`cursor-pointer flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded text-slate-300 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
                                <IconPlus /> Upload Image
                                <input type="file" accept="image/*,.psd" className="hidden" onChange={handleImageUpload} disabled={disabled} />
                            </label>
                        )}
                    </div>
                </div>
             </div>
             <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Video Options</label>
                  <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input type="checkbox" checked={entry.renderWaveform} disabled={disabled} onChange={(e) => onUpdate(entry.id, 'renderWaveform', e.target.checked)} className="w-3.5 h-3.5 rounded bg-slate-800 text-indigo-500" />
                        Waveform
                    </label>
                    <select value={entry.videoCodec} disabled={disabled} onChange={(e) => onUpdate(entry.id, 'videoCodec', e.target.value)} className="bg-slate-800 border border-slate-700 text-xs rounded px-1 py-0.5 text-slate-300 outline-none">
                        {CODECS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                    </select>
                  </div>
             </div>
        </div>
    </div>
  );
};
