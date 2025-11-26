
import React, { useRef, useEffect } from 'react';

interface LogViewerProps {
  logs: string[];
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="bg-slate-900 rounded-lg p-3 h-24 overflow-y-auto text-xs font-mono text-slate-400 border border-slate-800 mb-4">
      {logs.map((log, i) => (
        <div key={i} className="mb-1 text-slate-500">&gt; {log}</div>
      ))}
      <div ref={endRef} />
    </div>
  );
};
