
import React, { useState } from 'react';
import { BookEntry, ProcessingStatus } from '../types';
import { IconCheck, IconDownload, IconVideo, IconCopy } from './Icons';
import { copyToClipboard, getDownloadFilename } from '../utils';

interface BookOutputProps {
  book: BookEntry;
  onRenderVideo: (id: string) => void;
}

export const BookOutput: React.FC<BookOutputProps> = ({ book, onRenderVideo }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    if (await copyToClipboard(text)) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (book.result.status !== ProcessingStatus.COMPLETED) return null;

  return (
    <div className="px-6 pb-6 space-y-4">
        {/* Completion Actions */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-emerald-900/30">
             <div className="flex items-center gap-2 text-emerald-400 mb-4 font-bold">
               <IconCheck /> Generation Complete
             </div>
             <div className="flex flex-wrap gap-3">
                {book.result.audioUrl && (
                    <button onClick={() => downloadFile(book.result.audioUrl!, getDownloadFilename(book, 'wav'))} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20">
                        <IconDownload /> Download Audio (WAV)
                    </button>
                )}
                {(book.result.audioUrl && book.videoImage) && !book.result.videoUrl && (
                     <button onClick={() => onRenderVideo(book.id)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-600">
                        <IconVideo /> Render Video Now
                     </button>
                )}
                {book.result.videoUrl && (
                     <button onClick={() => downloadFile(book.result.videoUrl!, getDownloadFilename(book, 'webm'))} className="flex items-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-900/20">
                        <IconDownload /> Download Video (WebM)
                     </button>
                )}
             </div>
             <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                 {book.result.audioUrl && (
                     <div className="bg-slate-950 p-3 rounded border border-slate-800">
                         <label className="text-xs text-slate-500 uppercase font-bold block mb-2">Audio Preview</label>
                         <audio controls src={book.result.audioUrl} className="w-full h-8" />
                     </div>
                 )}
                 {book.result.videoUrl && (
                     <div className="bg-slate-900 p-3 rounded border border-slate-800">
                         <label className="text-xs text-slate-500 uppercase font-bold block mb-2">Video Preview</label>
                         <video controls src={book.result.videoUrl} className="w-full h-auto rounded max-h-48" />
                     </div>
                 )}
             </div>
        </div>
        
        {/* Scripts & SEO */}
        <div className="space-y-4">
            {book.result.script && (
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Generated Script</label>
                        <button onClick={() => handleCopy(book.result.script, `script-${book.id}`)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                            {copiedId === `script-${book.id}` ? <IconCheck /> : <IconCopy />} Copy Script
                        </button>
                    </div>
                    <textarea readOnly value={book.result.script} rows={6} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-slate-400 font-mono resize-y focus:outline-none" />
                </div>
            )}
            {book.result.seo && (
                <div className="grid grid-cols-1 gap-4 p-4 bg-slate-950 border border-slate-800 rounded-lg">
                    {/* SEO Fields (Title, Desc, Tags) */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">SEO Title</label>
                            <button onClick={() => handleCopy(book.result.seo!.title, `title-${book.id}`)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                {copiedId === `title-${book.id}` ? <IconCheck /> : <IconCopy />} Copy
                            </button>
                        </div>
                        <div className="p-2 bg-slate-900 border border-slate-800 rounded text-sm text-white">{book.result.seo.title}</div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">SEO Description</label>
                            <button onClick={() => handleCopy(book.result.seo!.description, `desc-${book.id}`)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                {copiedId === `desc-${book.id}` ? <IconCheck /> : <IconCopy />} Copy
                            </button>
                        </div>
                        <textarea readOnly value={book.result.seo.description} rows={8} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-300 whitespace-pre-wrap resize-y focus:outline-none" />
                    </div>
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">SEO Tags</label>
                            <button onClick={() => handleCopy(book.result.seo!.tags.join(', '), `tags-${book.id}`)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                {copiedId === `tags-${book.id}` ? <IconCheck /> : <IconCopy />} Copy
                            </button>
                        </div>
                        <div className="p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-400">{book.result.seo.tags.join(', ')}</div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
