
import React from 'react';
import { BookEntry, CtaFile } from '../types';
import { EMOTIONS, SPEEDS, CODECS, VOICE_PROFILES } from '../config';
import { getProfile } from '../utils';
import { IconPlus, IconImage, IconTrash, IconPlay, IconStop } from './Icons';

interface BookInputProps {
  index: number;
  book: BookEntry;
  language: string;
  ctaFiles: CtaFile[];
  onUpdate: (id: string, field: keyof any, value: any) => void;
  onPreviewVoice: (id: string) => void;
  previewStatus: { id: string, state: 'loading' | 'playing' } | null;
  disabled?: boolean;
}

export const BookInput: React.FC<BookInputProps> = ({
  index, book, language, ctaFiles, onUpdate, onPreviewVoice, previewStatus, disabled
}) => {
  const currentProfile = getProfile(book.voiceProfileId);
  const isPreviewing = previewStatus?.id === book.voiceProfileId;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpdate(book.id, 'videoImage', e.target.files[0]);
    }
    e.target.value = '';
  };

  return (
    <div className={`p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start ${disabled ? 'opacity-75 pointer-events-none grayscale-[0.2]' : ''}`}>
        <div className="md:col-span-1 flex justify-center pt-2">
          <span className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 font-bold text-sm flex items-center justify-center">{index + 1}</span>
        </div>
        
        <div className="md:col-span-5">
           <label className="block text-xs text-slate-500 mb-1">Title</label>
           <input 
              type="text" 
              value={book.title}
              disabled={disabled}
              placeholder="e.g. Atomic Habits"
              onChange={(e) => onUpdate(book.id, 'title', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:border-indigo-500 outline-none"
           />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Duration (min)</label>
          <input 
            type="number" min={1} max={30}
            value={book.durationMinutes}
            disabled={disabled}
            onChange={(e) => onUpdate(book.id, 'durationMinutes', parseInt(e.target.value))}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="md:col-span-4">
          <div className="flex justify-between mb-1">
             <label className="block text-xs text-slate-500">Voice</label>
             <span className="text-[10px] text-indigo-400 font-bold uppercase">{language}</span>
          </div>
          <div className="flex gap-2">
            <div className="relative group flex-grow">
                <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 cursor-pointer hover:border-indigo-500 h-full">
                    <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${currentProfile.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`} alt="av" className="w-8 h-8 rounded-full bg-slate-800"/>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{currentProfile.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{currentProfile.gender} • {currentProfile.age} • {currentProfile.style}</div>
                    </div>
                    <select 
                        value={book.voiceProfileId}
                        disabled={disabled}
                        onChange={(e) => onUpdate(book.id, 'voiceProfileId', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer bg-slate-900 text-white"
                    >
                        {VOICE_PROFILES.map(p => (
                        <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                            {p.name} - {p.gender}, {p.age} ({p.style})
                        </option>
                        ))}
                    </select>
                </div>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onPreviewVoice(book.voiceProfileId); }}
                className="bg-slate-800 border border-slate-700 rounded px-2 hover:bg-slate-700 text-slate-300 pointer-events-auto"
                title="Preview Voice"
            >
                {isPreviewing && previewStatus?.state === 'playing' ? <IconStop /> : <IconPlay />}
            </button>
          </div>
        </div>

        <div className="md:col-span-1"></div>
        <div className="md:col-span-3">
           <label className="block text-xs text-slate-500 mb-1">Emotion</label>
           <select value={book.emotion} disabled={disabled} onChange={(e) => onUpdate(book.id, 'emotion', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-sm text-slate-200 outline-none">
             {EMOTIONS.map(e => <option key={e} value={e} className="bg-slate-900">{e}</option>)}
           </select>
        </div>
        <div className="md:col-span-3">
           <label className="block text-xs text-slate-500 mb-1">Speed</label>
           <select value={book.speed} disabled={disabled} onChange={(e) => onUpdate(book.id, 'speed', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-sm text-slate-200 outline-none">
             {SPEEDS.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
           </select>
        </div>
        <div className="md:col-span-4">
           <label className="block text-xs text-slate-500 mb-1">Audio Tail (CTA)</label>
           <select value={book.ctaId || ""} disabled={disabled} onChange={(e) => onUpdate(book.id, 'ctaId', e.target.value || null)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-sm text-slate-200 outline-none">
             <option value="" className="bg-slate-900">None</option>
             {ctaFiles.map(f => <option key={f.id} value={f.id} className="bg-slate-900">{f.name}</option>)}
           </select>
        </div>

        <div className="md:col-span-1"></div>
        <div className="md:col-span-11 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Video Background</label>
                <div className="flex items-center gap-3">
                    {book.videoImage ? (
                        <div className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1 border border-slate-700">
                            <IconImage />
                            <span className="text-xs text-slate-200 truncate max-w-[150px]">{book.videoImage.name}</span>
                            <button onClick={() => onUpdate(book.id, 'videoImage', null)} disabled={disabled} className="text-slate-400 hover:text-red-400"><IconTrash /></button>
                        </div>
                    ) : (
                        <label className={`cursor-pointer flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded text-slate-300 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
                            <IconPlus /> Upload Image/PSD
                            <input type="file" accept="image/*,.psd" className="hidden" onChange={handleImageUpload} disabled={disabled} />
                        </label>
                    )}
                </div>
            </div>
            <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Video Options</label>
                 <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input type="checkbox" checked={book.renderWaveform} disabled={disabled} onChange={(e) => onUpdate(book.id, 'renderWaveform', e.target.checked)} className="w-3.5 h-3.5 rounded bg-slate-800 text-indigo-500" />
                        Show Waveform
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase">Codec</span>
                        <select value={book.videoCodec} disabled={disabled} onChange={(e) => onUpdate(book.id, 'videoCodec', e.target.value)} className="bg-slate-800 border border-slate-700 text-xs rounded px-1 py-0.5 text-slate-300 outline-none">
                            {CODECS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                        </select>
                    </div>
                 </div>
            </div>
        </div>
    </div>
  );
};
