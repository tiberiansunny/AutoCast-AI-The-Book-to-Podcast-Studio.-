
import React from 'react';
import { IconPlus } from './Icons';
import { LANGUAGES } from '../config';
import { CtaFile } from '../types';

interface GlobalSettingsProps {
  language: string;
  setLanguage: (val: string) => void;
  systemPrompt: string;
  setSystemPrompt: (val: string) => void;
  audioRules: string;
  setAudioRules: (val: string) => void;
  descriptionTail: string;
  setDescriptionTail: (val: string) => void;
  normalizeAudio: boolean;
  setNormalizeAudio: (val: boolean) => void;
  compressAudio: boolean;
  setCompressAudio: (val: boolean) => void;
  ctaFiles: CtaFile[];
  onCtaUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({
  language, setLanguage,
  systemPrompt, setSystemPrompt,
  audioRules, setAudioRules,
  descriptionTail, setDescriptionTail,
  normalizeAudio, setNormalizeAudio,
  compressAudio, setCompressAudio,
  ctaFiles, onCtaUpload
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="bg-indigo-600 w-2 h-6 rounded-sm"></span>
        Global Settings
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Language</label>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white"
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="bg-slate-950 p-3 rounded-md border border-slate-800">
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Audio Engineering</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={normalizeAudio} onChange={(e) => setNormalizeAudio(e.target.checked)} className="w-4 h-4 rounded bg-slate-800 text-indigo-500" />
              Normalize
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={compressAudio} onChange={(e) => setCompressAudio(e.target.checked)} className="w-4 h-4 rounded bg-slate-800 text-indigo-500" />
              Soft Compression
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">System Persona</label>
          <textarea 
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={8}
            className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-y text-slate-300 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Audio Rules</label>
          <textarea 
            value={audioRules}
            onChange={(e) => setAudioRules(e.target.value)}
            rows={8}
            className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-y text-slate-300 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description Tail</label>
          <textarea 
            value={descriptionTail}
            onChange={(e) => setDescriptionTail(e.target.value)}
            rows={5}
            className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-y text-slate-300"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Audio Tails</label>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {ctaFiles.map(f => <span key={f.id} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">{f.name}</span>)}
            </div>
            <label className="cursor-pointer inline-flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-sm text-slate-300">
              <IconPlus /> Upload MP3/WAV
              <input type="file" accept="audio/*" multiple className="hidden" onChange={onCtaUpload} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
