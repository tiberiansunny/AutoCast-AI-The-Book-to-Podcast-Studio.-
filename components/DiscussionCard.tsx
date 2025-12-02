
import React from 'react';
import { DiscussionEntry, ProcessingStatus, CtaFile } from '../types';
import { IconTrash, IconRefresh, IconSparkles, IconCopy, IconCheck } from './Icons';
import { DiscussionInput } from './DiscussionInput';
import { BookStatus } from './BookStatus';
import { BookOutput } from './BookOutput';
import { copyToClipboard } from '../utils';

interface DiscussionCardProps {
  index: number;
  entry: DiscussionEntry;
  language: string;
  ctaFiles: CtaFile[];
  onUpdate: (id: string, field: keyof any, value: any) => void;
  onRemove: (id: string) => void;
  onGenerate: (id: string) => void;
  onAbort: (id: string) => void;
  onRenderVideo: (id: string) => void;
  isGlobalProcessing: boolean;
  onPreviewVoice: (id: string) => void;
  previewStatus: { id: string, state: 'loading' | 'playing' } | null;
}

export const DiscussionCard: React.FC<DiscussionCardProps> = ({
  index, entry, language, ctaFiles,
  onUpdate, onRemove, onGenerate, onAbort, onRenderVideo,
  isGlobalProcessing, onPreviewVoice, previewStatus
}) => {
  const isProcessing = entry.result.status !== ProcessingStatus.IDLE && 
                       entry.result.status !== ProcessingStatus.COMPLETED && 
                       entry.result.status !== ProcessingStatus.ERROR;
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    if (await copyToClipboard(text)) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg transition-all hover:border-slate-700 mb-6">
      <DiscussionInput 
        index={index} 
        entry={entry} 
        language={language} 
        ctaFiles={ctaFiles} 
        onUpdate={onUpdate} 
        onPreviewVoice={onPreviewVoice}
        previewStatus={previewStatus}
        disabled={isProcessing}
      />
      
      <div className="bg-slate-950 border-t border-slate-800 pt-6">
          <BookStatus 
            id={entry.id} 
            result={entry.result} 
            onAbort={onAbort} 
          />
          
          <BookOutput 
            book={entry as any} 
            onRenderVideo={onRenderVideo} 
          />
          
          {/* A/B Titles Display for Discussion */}
          {entry.result.seo?.abTitles && (
            <div className="px-6 pb-4">
                 <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">A/B Testing Titles</label>
                    <ul className="space-y-2">
                        {entry.result.seo.abTitles.map((t, i) => (
                            <li key={i} className="flex justify-between items-center text-sm text-slate-300">
                                <span>{i+1}. {t}</span>
                                <button onClick={() => handleCopy(t, `ab-${entry.id}-${i}`)} className="text-indigo-400 hover:text-white">
                                    {copiedId === `ab-${entry.id}-${i}` ? <IconCheck /> : <IconCopy />}
                                </button>
                            </li>
                        ))}
                    </ul>
                 </div>
            </div>
          )}

          <div className="px-6 pb-6 flex justify-between items-center mt-2">
              <button onClick={() => onRemove(entry.id)} className="text-red-500 hover:text-red-400 text-xs flex items-center gap-1">
                  <IconTrash /> Remove Discussion
              </button>
              {(entry.result.status === ProcessingStatus.IDLE || entry.result.status === ProcessingStatus.ERROR) && (
                  <button 
                      onClick={() => onGenerate(entry.id)}
                      disabled={isGlobalProcessing}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-900/20 transition-all flex items-center gap-2"
                  >
                      {entry.result.status === ProcessingStatus.ERROR ? <IconRefresh /> : <IconSparkles />}
                      {entry.result.status === ProcessingStatus.ERROR ? "Retry Discussion" : "Generate Discussion"}
                  </button>
              )}
          </div>
      </div>
    </div>
  );
};
