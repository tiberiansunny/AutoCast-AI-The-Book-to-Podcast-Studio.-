
import React from 'react';
import { BookResult, ProcessingStatus } from '../types';
import { IconTrash } from './Icons';
import { LogViewer } from './LogViewer';

interface BookStatusProps {
  id: string;
  result: BookResult;
  onAbort: (id: string) => void;
}

export const BookStatus: React.FC<BookStatusProps> = ({ id, result, onAbort }) => {
  if (result.status === ProcessingStatus.IDLE || result.status === ProcessingStatus.COMPLETED || result.status === ProcessingStatus.ERROR) {
      // If completed or idle, we still show logs if there are any useful ones, but usually the main progress bar is hidden.
      // However, BookCard usually manages visibility. This component handles the active processing view.
      // If we are COMPLETED, we might still want to show the final logs.
      return <LogViewer logs={result.logs} />;
  }

  return (
    <div className="mb-6 space-y-3 px-6">
        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>{result.status.replace(/_/g, " ")}</span>
            <div className="text-right">
                <div className="text-indigo-400">{result.progress?.totalPercent}% Total</div>
                {result.progress && (
                    <div className="text-[10px] text-slate-600 whitespace-nowrap">Est. Time: {Math.ceil(result.progress.estimatedTotalSeconds)}s</div>
                )}
            </div>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300 ease-out" style={{ width: `${result.progress?.totalPercent || 0}%` }} />
        </div>
        <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-600 font-mono">Current Step: {result.progress?.stepPercent}%</span>
            <button onClick={() => onAbort(id)} className="text-[10px] text-red-500 hover:text-red-400 border border-red-900/50 bg-red-950/20 px-2 py-0.5 rounded flex items-center gap-1">
                <IconTrash /> Abort
            </button>
        </div>
        <div className="h-0.5 w-full bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-800/50 transition-all duration-200" style={{ width: `${result.progress?.stepPercent || 0}%` }} />
        </div>
        
        <LogViewer logs={result.logs} />
    </div>
  );
};
