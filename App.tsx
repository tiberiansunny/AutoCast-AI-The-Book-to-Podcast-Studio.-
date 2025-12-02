
import React from 'react';
import { usePodcastStudio } from './hooks/usePodcastStudio';
import { GlobalSettings } from './components/GlobalSettings';
import { BookCard } from './components/BookCard';
import { DiscussionCard } from './components/DiscussionCard';
import { IconPlus, IconVideo, IconDownload, IconSparkles } from './components/Icons';
import { APP_NAME, APP_TAGLINE } from './config';

function App() {
  const vm = usePodcastStudio();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 font-sans flex flex-col min-h-screen">
      <header className="mb-8 text-center">
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
            
          {/* Mode Switcher */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
             <button 
                onClick={() => vm.setAppMode('BOOK')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${vm.appMode === 'BOOK' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
             >
                Book Summaries
             </button>
             <button 
                onClick={() => vm.setAppMode('DISCUSSION')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${vm.appMode === 'DISCUSSION' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
             >
                Discussion / Podcast
             </button>
          </div>

          {/* Global Actions Bar */}
          <div className="space-y-3">
             <button 
                onClick={vm.generateAll}
                disabled={vm.isGlobalProcessing}
                className={`w-full py-4 rounded-xl text-lg font-bold shadow-lg transition-all ${
                vm.isGlobalProcessing ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 text-white'}`}
            >
                {vm.isGlobalProcessing ? "Processing..." : vm.appMode === 'BOOK' ? "Generate Book Series" : "Generate Podcast Episodes"}
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

          {/* Content List */}
          <div className="flex justify-between items-center mb-2">
             <h2 className="text-2xl font-bold text-white">{vm.appMode === 'BOOK' ? 'Books' : 'Discussions'}</h2>
             <button onClick={vm.appMode === 'BOOK' ? vm.addBook : vm.addDiscussion} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors font-bold">
               <IconPlus /> {vm.appMode === 'BOOK' ? 'Add Book' : 'Add Discussion'}
             </button>
          </div>

          {vm.appMode === 'BOOK' ? (
              vm.books.map((book, index) => (
                <BookCard 
                  key={book.id} index={index} book={book}
                  language={vm.language} ctaFiles={vm.ctaFiles}
                  onUpdate={vm.updateEntry} onRemove={vm.removeEntry}
                  onGenerate={vm.processBook} onAbort={vm.abort}
                  onRenderVideo={vm.processVideo}
                  isGlobalProcessing={vm.isGlobalProcessing}
                  onPreviewVoice={vm.previewVoice} previewStatus={vm.previewStatus}
                />
              ))
          ) : (
              vm.discussions.map((discussion, index) => (
                <DiscussionCard 
                  key={discussion.id} index={index} entry={discussion}
                  language={vm.language} ctaFiles={vm.ctaFiles}
                  onUpdate={vm.updateEntry} onRemove={vm.removeEntry}
                  onGenerate={vm.processDiscussion} onAbort={vm.abort}
                  onRenderVideo={vm.processVideo}
                  isGlobalProcessing={vm.isGlobalProcessing}
                  onPreviewVoice={vm.previewVoice} previewStatus={vm.previewStatus}
                />
              ))
          )}
        </div>
      </div>
      
      <footer className="mt-12 text-center text-slate-600 text-xs py-8 border-t border-slate-900">
        <p>{APP_NAME} • <a href="https://bonaidea.pro" target="_blank" rel="noreferrer" className="hover:text-indigo-400">Created by bonaidea.pro</a> • <a href="https://send.monobank.ua/jar/6iPbbAAWwe" target="_blank" rel="noreferrer" className="hover:text-indigo-400">Support</a></p>
      </footer>
    </div>
  );
}

export default App;
