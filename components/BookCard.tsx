
import React from 'react';
import { BookEntry, ProcessingStatus, CtaFile } from '../types';
import { IconTrash, IconRefresh, IconSparkles } from './Icons';
import { BookInput } from './BookInput';
import { BookStatus } from './BookStatus';
import { BookOutput } from './BookOutput';

interface BookCardProps {
  index: number;
  book: BookEntry;
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

export const BookCard: React.FC<BookCardProps> = ({
  index, book, language, ctaFiles,
  onUpdate, onRemove, onGenerate, onAbort, onRenderVideo,
  isGlobalProcessing, onPreviewVoice, previewStatus
}) => {
  const isProcessing = book.result.status !== ProcessingStatus.IDLE && 
                       book.result.status !== ProcessingStatus.COMPLETED && 
                       book.result.status !== ProcessingStatus.ERROR;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg transition-all hover:border-slate-700 mb-6">
      <BookInput 
        index={index} 
        book={book} 
        language={language} 
        ctaFiles={ctaFiles} 
        onUpdate={onUpdate} 
        onPreviewVoice={onPreviewVoice}
        previewStatus={previewStatus}
        disabled={isProcessing}
      />
      
      <div className="bg-slate-950 border-t border-slate-800 pt-6">
          <BookStatus 
            id={book.id} 
            result={book.result} 
            onAbort={onAbort} 
          />
          
          <BookOutput 
            book={book} 
            onRenderVideo={onRenderVideo} 
          />

          <div className="px-6 pb-6 flex justify-between items-center mt-6">
              <button onClick={() => onRemove(book.id)} className="text-red-500 hover:text-red-400 text-xs flex items-center gap-1">
                  <IconTrash /> Remove Episode
              </button>
              {(book.result.status === ProcessingStatus.IDLE || book.result.status === ProcessingStatus.ERROR) && (
                  <button 
                      onClick={() => onGenerate(book.id)}
                      disabled={isGlobalProcessing}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-900/20 transition-all flex items-center gap-2"
                  >
                      {book.result.status === ProcessingStatus.ERROR ? <IconRefresh /> : <IconSparkles />}
                      {book.result.status === ProcessingStatus.ERROR ? "Retry Episode" : "Generate Episode"}
                  </button>
              )}
          </div>
      </div>
    </div>
  );
};
