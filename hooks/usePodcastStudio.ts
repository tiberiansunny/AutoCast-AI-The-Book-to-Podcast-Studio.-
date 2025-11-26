
import { useState, useRef, useEffect } from 'react';
import { BookEntry, CtaFile, ProcessingStatus, Section } from '../types';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_AUDIO_RULES, DEFAULT_DESCRIPTION_TAIL, WEIGHTS, VOICE_PROFILES } from '../config';
import { searchBookInfo, generateScript, generateSpeech, generateSEO } from '../services/gemini';
import { decodeBase64Audio, decodeArrayBuffer, concatenateAudioBuffers, audioBufferToWav, resampleBuffer, applyAudioPostProcessing, createSilenceBuffer } from '../services/audio';
import { renderVideo } from '../services/video';
import { formatTimestamp, getProfile } from '../utils';

export const usePodcastStudio = () => {
  // --- State ---
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [language, setLanguage] = useState('English');
  const [audioRules, setAudioRules] = useState(DEFAULT_AUDIO_RULES);
  const [descriptionTail, setDescriptionTail] = useState(DEFAULT_DESCRIPTION_TAIL);
  const [normalizeAudio, setNormalizeAudio] = useState(true);
  const [compressAudio, setCompressAudio] = useState(true);
  const [ctaFiles, setCtaFiles] = useState<CtaFile[]>([]);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<{ id: string, state: 'loading' | 'playing' } | null>(null);

  const [books, setBooks] = useState<BookEntry[]>([{
    id: crypto.randomUUID(),
    title: "", durationMinutes: 3, voiceProfileId: "Elena", emotion: "Enthusiastic", speed: "Normal",
    ctaId: null, videoImage: null, renderWaveform: false, videoCodec: 'vp9',
    result: { status: ProcessingStatus.IDLE, script: "", audioUrl: null, videoUrl: null, seo: null, logs: [] }
  }]);

  // Ref to access fresh state inside async closures
  const booksRef = useRef(books);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { booksRef.current = books; }, [books]);

  // --- Actions ---

  const addBook = () => {
    setBooks(prev => [...prev, {
      id: crypto.randomUUID(), title: "", durationMinutes: 3, voiceProfileId: "Elena", emotion: "Enthusiastic", speed: "Normal",
      ctaId: ctaFiles.length > 0 ? ctaFiles[0].id : null, videoImage: null, renderWaveform: false, videoCodec: 'vp9',
      result: { status: ProcessingStatus.IDLE, script: "", audioUrl: null, videoUrl: null, seo: null, logs: [] }
    }]);
  };

  const removeBook = (id: string) => {
    abortControllers.current.get(id + '_audio')?.abort();
    abortControllers.current.get(id + '_video')?.abort();
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  const updateBook = (id: string, field: keyof BookEntry, value: any) => {
    setBooks(prev => prev.map(b => {
      if (b.id !== id) return b;
      const isCritical = ['title', 'durationMinutes', 'voiceProfileId', 'emotion', 'speed', 'ctaId'].includes(field as string);
      const newResult = isCritical 
        ? { ...b.result, status: ProcessingStatus.IDLE, audioUrl: null, videoUrl: null, script: "" } 
        : b.result;
      return { ...b, [field]: value, result: newResult };
    }));
  };

  const handleCtaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: CtaFile[] = [];
    for (const file of Array.from(e.target.files)) {
      newFiles.push({ id: crypto.randomUUID(), name: file.name, file, buffer: await file.arrayBuffer() });
    }
    setCtaFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  // --- Logic Helpers ---

  const updateStatus = (id: string, status: ProcessingStatus, log?: string) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, result: { ...b.result, status, logs: log ? [...b.result.logs, log] : b.result.logs } } : b));
  };

  const updateProgress = (id: string, stepPercent: number, totalPercent: number) => {
    setBooks(prev => prev.map(b => {
      if (b.id !== id) return b;
      const startTime = b.result.progress?.startTime || Date.now();
      const elapsed = (Date.now() - startTime) / 1000;
      // Simple linear projection for estimation
      const estimatedTotalSeconds = totalPercent > 5 ? elapsed / (totalPercent / 100) : b.durationMinutes * 40;
      return { ...b, result: { ...b.result, progress: { stepPercent, totalPercent, startTime, estimatedTotalSeconds } } };
    }));
  };

  // --- Core Workflows ---

  const processBook = async (bookId: string) => {
    const book = booksRef.current.find(b => b.id === bookId);
    if (!book) return;

    const controller = new AbortController();
    abortControllers.current.set(bookId + '_audio', controller);
    const { signal } = controller;
    const checkAbort = () => { if (signal.aborted) throw new Error("Processing aborted by user"); };

    updateStatus(bookId, ProcessingStatus.ANALYZING, "Starting process...");
    
    // Reset progress
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, result: { ...b.result, progress: { stepPercent: 0, totalPercent: 0, startTime: Date.now(), estimatedTotalSeconds: 60 } } } : b));

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const profile = getProfile(book.voiceProfileId);

      // 1. Research
      updateStatus(bookId, ProcessingStatus.ANALYZING, `Researching "${book.title}"...`);
      const researchData = await searchBookInfo(book.title);
      checkAbort();
      updateProgress(bookId, 100, WEIGHTS.SEARCH);

      // 2. Scripting
      updateStatus(bookId, ProcessingStatus.SCRIPTING, "Generating script...");
      const fullScript = await generateScript(book.title, researchData, systemPrompt, audioRules, book.durationMinutes, language, book.emotion, book.speed);
      checkAbort();
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, result: { ...b.result, script: fullScript } } : b));
      updateProgress(bookId, 100, WEIGHTS.SEARCH + WEIGHTS.SCRIPT);

      // 3. Parsing
      const rawSections = fullScript.split(/###SECTION:\s*(.*?)###/);
      const sections: Section[] = [];
      for (let i = 1; i < rawSections.length; i += 2) {
        if (rawSections[i] && rawSections[i+1]) sections.push({ title: rawSections[i].trim(), content: rawSections[i+1].trim() });
      }
      if (sections.length === 0) sections.push({ title: "Full Summary", content: fullScript });

      // 4. Audio Generation
      updateStatus(bookId, ProcessingStatus.GENERATING_AUDIO, `Synthesizing ${sections.length} sections...`);
      const audioBuffers: AudioBuffer[] = [];
      const timestamps: string[] = [];
      let currentDuration = 0;

      for (let i = 0; i < sections.length; i++) {
        checkAbort();
        const section = sections[i];
        updateProgress(bookId, Math.round((i/sections.length)*100), WEIGHTS.SEARCH + WEIGHTS.SCRIPT + Math.round(WEIGHTS.AUDIO * (i/sections.length)));
        updateStatus(bookId, ProcessingStatus.GENERATING_AUDIO, `Generating: ${section.title}`);
        
        timestamps.push(`${formatTimestamp(currentDuration)} ${section.title}`);
        
        // Pass language and emotion for better accents
        const base64 = await generateSpeech(section.content, profile.geminiMapping, language, book.emotion);
        const buffer = await decodeBase64Audio(audioCtx, base64);
        audioBuffers.push(buffer);
        currentDuration += buffer.duration;
        
        if (i < sections.length - 1) currentDuration += 2; // Pause tracking
      }

      // 5. Mixing
      updateStatus(bookId, ProcessingStatus.MIXING, "Mixing and Mastering...");
      const silence = createSilenceBuffer(audioCtx, 2);
      const buffersToMix = audioBuffers.flatMap((buf, i) => i < audioBuffers.length - 1 ? [buf, silence] : [buf]);
      const speechBuffer = concatenateAudioBuffers(audioCtx, buffersToMix);

      let ctaBuffer: AudioBuffer | null = null;
      if (book.ctaId) {
        const file = ctaFiles.find(c => c.id === book.ctaId);
        if (file) {
          try {
            const raw = await decodeArrayBuffer(audioCtx, file.buffer);
            ctaBuffer = raw.sampleRate !== speechBuffer.sampleRate ? await resampleBuffer(raw, speechBuffer.sampleRate) : raw;
          } catch(e) { console.error("CTA error", e); }
        }
      }
      
      let finalBuffer = concatenateAudioBuffers(audioCtx, [speechBuffer, ctaBuffer]);
      finalBuffer = await applyAudioPostProcessing(finalBuffer, normalizeAudio, compressAudio);

      const audioUrl = URL.createObjectURL(audioBufferToWav(finalBuffer));
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, result: { ...b.result, audioUrl } } : b));
      updateProgress(bookId, 100, 95);

      // 6. SEO
      updateStatus(bookId, ProcessingStatus.GENERATING_SEO, "Generating SEO...");
      const seo = await generateSEO(book.title, fullScript, language, descriptionTail, timestamps.join('\n'));
      
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, result: { ...b.result, seo, status: ProcessingStatus.COMPLETED, logs: [...b.result.logs, "Done."], completedAt: new Date(), progress: undefined } } : b));

    } catch (e: any) {
      if (e.message !== "Processing aborted by user") {
        updateStatus(bookId, ProcessingStatus.ERROR, `Error: ${e.message}`);
      } else {
        updateStatus(bookId, ProcessingStatus.IDLE, "Aborted.");
      }
    } finally {
      abortControllers.current.delete(bookId + '_audio');
    }
  };

  const processVideo = async (bookId: string) => {
    const book = booksRef.current.find(b => b.id === bookId);
    if (!book || !book.result.audioUrl || !book.videoImage) return;

    const controller = new AbortController();
    abortControllers.current.set(bookId + '_video', controller);
    const { signal } = controller;

    updateStatus(bookId, ProcessingStatus.RENDERING_VIDEO, "Rendering Video...");
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, result: { ...b.result, progress: { stepPercent: 0, totalPercent: 0, startTime: Date.now(), estimatedTotalSeconds: 60 } } } : b));

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ab = await (await fetch(book.result.audioUrl)).arrayBuffer();
      const audioBuffer = await decodeArrayBuffer(audioCtx, ab);

      if (signal.aborted) throw new Error("Aborted");

      const blob = await renderVideo(audioBuffer, book.videoImage, { 
        renderWaveform: book.renderWaveform, 
        codec: book.videoCodec, 
        onProgress: (p) => updateProgress(bookId, p, p)
      });
      
      if (signal.aborted) throw new Error("Aborted");
      
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, result: { ...b.result, videoUrl: URL.createObjectURL(blob), status: ProcessingStatus.COMPLETED, logs: [...b.result.logs, "Video ready."], progress: undefined } } : b));

    } catch (e: any) {
       if (e.message !== "Aborted") updateStatus(bookId, ProcessingStatus.ERROR, `Video Error: ${e.message}`);
       else updateStatus(bookId, ProcessingStatus.COMPLETED, "Video aborted."); // Return to completed state (audio intact)
    } finally {
      abortControllers.current.delete(bookId + '_video');
    }
  };

  const previewVoice = async (id: string) => {
     if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
     if (previewStatus?.id === id) { setPreviewStatus(null); return; }

     setPreviewStatus({ id, state: 'loading' });
     try {
         const profile = getProfile(id);
         // Also preview with the selected language and emotion if possible, currently just defaults to English for preview
         // Or we can use the current selected language/emotion from the first book or global settings.
         // For simplicity, let's use the current global language.
         const base64 = await generateSpeech(`Hello. I am ${profile.name}.`, profile.geminiMapping, language, "Neutral");
         const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
         const buffer = await decodeBase64Audio(audioCtx, base64);
         const url = URL.createObjectURL(audioBufferToWav(buffer));
         const audio = new Audio(url);
         previewAudioRef.current = audio;
         audio.onended = () => { setPreviewStatus(null); URL.revokeObjectURL(url); };
         await audio.play();
         setPreviewStatus({ id, state: 'playing' });
     } catch (e) { console.error(e); setPreviewStatus(null); }
  };

  const automateAll = async () => {
    setIsGlobalProcessing(true);
    for (const b of booksRef.current) {
        if (!b.title) continue;
        if (b.result.status !== ProcessingStatus.COMPLETED) await processBook(b.id);
        const fresh = booksRef.current.find(x => x.id === b.id);
        if (fresh?.result.audioUrl && fresh.videoImage && !fresh.result.videoUrl) await processVideo(b.id);
    }
    setIsGlobalProcessing(false);
  };

  const abort = (id: string) => {
      abortControllers.current.get(id + '_audio')?.abort();
      abortControllers.current.get(id + '_video')?.abort();
  };

  return {
    // State
    systemPrompt, setSystemPrompt, language, setLanguage, audioRules, setAudioRules,
    descriptionTail, setDescriptionTail, normalizeAudio, setNormalizeAudio, compressAudio, setCompressAudio,
    ctaFiles, books, isGlobalProcessing, previewStatus,
    // Actions
    addBook, removeBook, updateBook, handleCtaUpload, 
    processBook, processVideo, abort, automateAll, previewVoice,
    // Bulk
    generateAll: async () => {
        setIsGlobalProcessing(true);
        for(const b of booksRef.current) if((b.result.status === ProcessingStatus.IDLE || b.result.status === ProcessingStatus.ERROR) && b.title) await processBook(b.id);
        setIsGlobalProcessing(false);
    },
    renderAllVideos: async () => {
        setIsGlobalProcessing(true);
        for(const b of booksRef.current) if(b.result.status === ProcessingStatus.COMPLETED && b.result.audioUrl && b.videoImage && !b.result.videoUrl) await processVideo(b.id);
        setIsGlobalProcessing(false);
    },
    downloadAll: () => {
        booksRef.current.forEach(b => {
            if(b.result.audioUrl) { const a = document.createElement('a'); a.href = b.result.audioUrl; a.download = `${b.title}.wav`; a.click(); }
            if(b.result.videoUrl) { const a = document.createElement('a'); a.href = b.result.videoUrl; a.download = `${b.title}.webm`; a.click(); }
        });
    }
  };
};
