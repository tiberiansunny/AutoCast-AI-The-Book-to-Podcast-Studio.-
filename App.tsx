
import React from 'react';
import { usePodcastStudio } from './hooks/usePodcastStudio';
import { GlobalSettings } from './components/GlobalSettings';
import { BookCard } from './components/BookCard';
import { IconPlus, IconVideo, IconDownload, IconSparkles } from './components/Icons';
import { APP_NAME, APP_TAGLINE } from './config';

function App() {
  const vm = usePodcastStudio();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 font-sans flex flex-col min-h-screen">
      <header className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-4">
          {APP_NAME}
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">{APP_TAGLINE}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
        {/* LEFT: Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <GlobalSettings 
            language={vm.language} setLanguage={vm.setLanguage}
            systemPrompt={vm.systemPrompt} setSystemPrompt={vm.setSystemPrompt}
            audioRules={vm.audioRules} setAudioRules={vm.setAudioRules}
            descriptionTail={vm.descriptionTail} setDescriptionTail={vm.setDescriptionTail}
            normalizeAudio={vm.normalizeAudio} setNormalizeAudio={vm.setNormalizeAudio}
            compressAudio={vm.compressAudio} setCompressAudio={vm.setCompressAudio}
            ctaFiles={vm.ctaFiles} onCtaUpload={vm.handleCtaUpload}
          />
        </div>

        {/* RIGHT: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Global Actions Bar */}
          <div className="space-y-3">
             <button 
                onClick={vm.generateAll}
                disabled={vm.isGlobalProcessing}
                className={`w-full py-4 rounded-xl text-lg font-bold shadow-lg transition-all ${
                vm.isGlobalProcessing ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 text-white'}`}
            >
                {vm.isGlobalProcessing ? "Processing Series..." : "Generate Podcast Series"}
            </button>
            <div className="grid grid-cols-3 gap-3">
                 <button onClick={vm.renderAllVideos} disabled={vm.isGlobalProcessing} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 flex items-center justify-center gap-2">
                    <IconVideo /> Render Videos
                </button>
                <button onClick={vm.downloadAll} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 flex items-center justify-center gap-2">
                    <IconDownload /> Download All
                </button>
                <button onClick={vm.automateAll} disabled={vm.isGlobalProcessing} className="py-2 bg-emerald-900/50 hover:bg-emerald-900 border border-emerald-800 text-emerald-100 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                    <IconSparkles /> Automate All
                </button>
            </div>
          </div>

          {/* Episode List */}
          <div className="flex justify-between items-center mb-2">
             <h2 className="text-2xl font-bold text-white">Episodes</h2>
             <button onClick={vm.addBook} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">
               <IconPlus /> Add Episode
             </button>
          </div>

          {vm.books.map((book, index) => (
            <BookCard 
              key={book.id}
              index={index}
              book={book}
              language={vm.language}
              ctaFiles={vm.ctaFiles}
              onUpdate={vm.updateBook}
              onRemove={vm.removeBook}
              onGenerate={vm.processBook}
              onAbort={vm.abort}
              onRenderVideo={vm.processVideo}
              isGlobalProcessing={vm.isGlobalProcessing}
              onPreviewVoice={vm.previewVoice}
              previewStatus={vm.previewStatus}
            />
          ))}
        </div>
      </div>
      
      <footer className="mt-12 text-center text-slate-600 text-xs py-8 border-t border-slate-900">
        <p>{APP_NAME} • <a href="https://bonaidea.pro" target="_blank" rel="noreferrer" className="hover:text-indigo-400">Created by bonaidea.pro</a> • <a href="https://send.monobank.ua/jar/6iPbbAAWwe" target="_blank" rel="noreferrer" className="hover:text-indigo-400">Support</a></p>
      </footer>
    </div>
  );
}

export default App;
