
import React, { useState, useRef, useEffect } from 'react';
import { BookEntry, DiscussionEntry, CtaFile, ProcessingStatus, Section, AppMode } from '../types';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_AUDIO_RULES, DEFAULT_DISCUSSION_PROMPT, DEFAULT_DISCUSSION_RULES, DEFAULT_DESCRIPTION_TAIL, WEIGHTS, VOICE_PROFILES } from '../config';
import { searchBookInfo, generateScript, generateDiscussionScript, generateSpeech, generateSEO, generateDiscussionSEO } from '../services/gemini';
import { decodeBase64Audio, decodeArrayBuffer, concatenateAudioBuffers, audioBufferToWav, resampleBuffer, applyAudioPostProcessing, createSilenceBuffer } from '../services/audio';
import { renderVideo } from '../services/video';
import { formatTimestamp, getProfile } from '../utils';

export const usePodcastStudio = () => {
  // --- State ---
  const [appMode, setAppMode] = useState<AppMode>('BOOK');
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

  const [discussions, setDiscussions] = useState<DiscussionEntry[]>([{
      id: crypto.randomUUID(),
      topic: "", durationMinutes: 5, hostVoiceId: "Matt", guestVoiceIds: ["Elena"], rules: "", interactionWeight: 5,
      ctaId: null, videoImage: null, renderWaveform: false, videoCodec: 'vp9',
      result: { status: ProcessingStatus.IDLE, script: "", audioUrl: null, videoUrl: null, seo: null, logs: [] }
  }]);

  const booksRef = useRef(books);
  const discussionsRef = useRef(discussions);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { booksRef.current = books; }, [books]);
  useEffect(() => { discussionsRef.current = discussions; }, [discussions]);

  // --- Actions ---

  const addBook = () => {
    setBooks(prev => [...prev, {
      id: crypto.randomUUID(), title: "", durationMinutes: 3, voiceProfileId: "Elena", emotion: "Enthusiastic", speed: "Normal",
      ctaId: ctaFiles.length > 0 ? ctaFiles[0].id : null, videoImage: null, renderWaveform: false, videoCodec: 'vp9',
      result: { status: ProcessingStatus.IDLE, script: "", audioUrl: null, videoUrl: null, seo: null, logs: [] }
    }]);
  };

  const addDiscussion = () => {
      setDiscussions(prev => [...prev, {
        id: crypto.randomUUID(), topic: "", durationMinutes: 5, hostVoiceId: "Matt", guestVoiceIds: ["Elena"], rules: "", interactionWeight: 5,
        ctaId: ctaFiles.length > 0 ? ctaFiles[0].id : null, videoImage: null, renderWaveform: false, videoCodec: 'vp9',
        result: { status: ProcessingStatus.IDLE, script: "", audioUrl: null, videoUrl: null, seo: null, logs: [] }
      }]);
  };

  const removeEntry = (id: string) => {
    abortControllers.current.get(id + '_audio')?.abort();
    abortControllers.current.get(id + '_video')?.abort();
    if (appMode === 'BOOK') setBooks(prev => prev.filter(b => b.id !== id));
    else setDiscussions(prev => prev.filter(d => d.id !== id));
  };

  const updateEntry = (id: string, field: keyof any, value: any) => {
    const updateList = (list: any[]) => list.map(item => {
        if (item.id !== id) return item;
        // Reset result on critical changes
        const isCritical = ['title', 'topic', 'durationMinutes', 'voiceProfileId', 'hostVoiceId', 'guestVoiceIds', 'emotion', 'speed', 'ctaId', 'interactionWeight'].includes(field as string);
        const newResult = isCritical 
          ? { ...item.result, status: ProcessingStatus.IDLE, audioUrl: null, videoUrl: null, script: "" } 
          : item.result;
        return { ...item, [field]: value, result: newResult };
    });

    if (appMode === 'BOOK') setBooks(prev => updateList(prev));
    else setDiscussions(prev => updateList(prev));
  };

  const handleCtaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: CtaFile[] = [];
    const files = e.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newFiles.push({ id: crypto.randomUUID(), name: file.name, file, buffer: await file.arrayBuffer() });
    }
    setCtaFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  // --- Logic Helpers ---

  const updateStatus = (id: string, status: ProcessingStatus, log?: string) => {
    const updater = (prev: any[]) => prev.map(b => b.id === id ? { ...b, result: { ...b.result, status, logs: log ? [...b.result.logs, log] : b.result.logs } } : b);
    if (appMode === 'BOOK') setBooks(updater);
    else setDiscussions(updater);
  };

  const updateProgress = (id: string, stepPercent: number, totalPercent: number) => {
    const updater = (prev: any[]) => prev.map(b => {
      if (b.id !== id) return b;
      const startTime = b.result.progress?.startTime || Date.now();
      const elapsed = (Date.now() - startTime) / 1000;
      const estimatedTotalSeconds = totalPercent > 5 ? elapsed / (totalPercent / 100) : b.durationMinutes * 40;
      return { ...b, result: { ...b.result, progress: { stepPercent, totalPercent, startTime, estimatedTotalSeconds } } };
    });
    if (appMode === 'BOOK') setBooks(updater);
    else setDiscussions(updater);
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

  const processDiscussion = async (id: string) => {
    const discussion = discussionsRef.current.find(d => d.id === id);
    if (!discussion) return;

    const controller = new AbortController();
    abortControllers.current.set(id + '_audio', controller);
    const { signal } = controller;
    const checkAbort = () => { if (signal.aborted) throw new Error("Processing aborted by user"); };

    updateStatus(id, ProcessingStatus.ANALYZING, "Starting Discussion...");
    // Reset Progress
    setDiscussions(prev => prev.map(d => d.id === id ? { ...d, result: { ...d.result, progress: { stepPercent: 0, totalPercent: 0, startTime: Date.now(), estimatedTotalSeconds: 60 } } } : d));

    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const hostProfile = getProfile(discussion.hostVoiceId);
        const guestProfiles = discussion.guestVoiceIds.map(gid => getProfile(gid));
        
        // 1. Research Topic
        updateStatus(id, ProcessingStatus.ANALYZING, `Researching: ${discussion.topic}`);
        const researchData = await searchBookInfo(discussion.topic); // Reuse search function
        checkAbort();
        updateProgress(id, 100, WEIGHTS.SEARCH);

        // 2. Script
        updateStatus(id, ProcessingStatus.SCRIPTING, "Drafting dialogue...");
        const fullRules = DEFAULT_DISCUSSION_RULES + "\n" + discussion.rules;
        const script = await generateDiscussionScript(
            discussion.topic, 
            researchData, 
            DEFAULT_DISCUSSION_PROMPT, 
            fullRules, 
            discussion.durationMinutes, 
            language,
            hostProfile.name,
            guestProfiles.map(g => g.name),
            discussion.interactionWeight
        );
        checkAbort();
        setDiscussions(prev => prev.map(d => d.id === id ? { ...d, result: { ...d.result, script } } : d));
        updateProgress(id, 100, WEIGHTS.SEARCH + WEIGHTS.SCRIPT);

        // 3. Audio Generation (Line by Line)
        updateStatus(id, ProcessingStatus.GENERATING_AUDIO, "Recording Voices...");
        // Split by lines that start with [Name]:
        const lines = script.split('\n').filter(l => l.trim().length > 0);
        const audioBuffers: AudioBuffer[] = [];
        
        let processedLines = 0;
        for (const line of lines) {
            checkAbort();
            const match = line.match(/^\[(.*?)]: (.*)/);
            if (match) {
                const speakerName = match[1].trim();
                const content = match[2].trim();
                
                // Identify Voice
                let voiceMapping = hostProfile.geminiMapping; // Default to host
                if (guestProfiles.some(g => g.name === speakerName)) {
                    const guest = guestProfiles.find(g => g.name === speakerName);
                    if (guest) voiceMapping = guest.geminiMapping;
                }
                
                // Only generate if content exists
                if (content.length > 2) {
                    updateStatus(id, ProcessingStatus.GENERATING_AUDIO, `Voice: ${speakerName}`);
                    const base64 = await generateSpeech(content, voiceMapping, language, "Neutral"); // Conversations are usually neutral/conversational
                    const buffer = await decodeBase64Audio(audioCtx, base64);
                    audioBuffers.push(buffer);
                }
            }
            processedLines++;
            updateProgress(id, Math.round((processedLines/lines.length)*100), WEIGHTS.SEARCH + WEIGHTS.SCRIPT + Math.round(WEIGHTS.AUDIO * (processedLines/lines.length)));
        }

        // 4. Mixing
        updateStatus(id, ProcessingStatus.MIXING, "Mixing Discussion...");
        // Dynamic silence based on Interaction Weight
        // Higher weight (10) -> Less silence (faster)
        // Lower weight (1) -> More silence (slower)
        const weight = discussion.interactionWeight || 5;
        // Formula: Max 0.8s, Min 0.1s. Linear interpolation.
        const pauseDuration = Math.max(0.1, 0.9 - (weight * 0.08)); 
        
        const silence = createSilenceBuffer(audioCtx, pauseDuration);
        const buffersToMix = audioBuffers.flatMap((buf, i) => i < audioBuffers.length - 1 ? [buf, silence] : [buf]);
        const speechBuffer = concatenateAudioBuffers(audioCtx, buffersToMix);

        let ctaBuffer: AudioBuffer | null = null;
        if (discussion.ctaId) {
            const file = ctaFiles.find(c => c.id === discussion.ctaId);
            if (file) {
                const raw = await decodeArrayBuffer(audioCtx, file.buffer);
                ctaBuffer = raw.sampleRate !== speechBuffer.sampleRate ? await resampleBuffer(raw, speechBuffer.sampleRate) : raw;
            }
        }
        
        let finalBuffer = concatenateAudioBuffers(audioCtx, [speechBuffer, ctaBuffer]);
        finalBuffer = await applyAudioPostProcessing(finalBuffer, normalizeAudio, compressAudio);
        
        const audioUrl = URL.createObjectURL(audioBufferToWav(finalBuffer));
        setDiscussions(prev => prev.map(d => d.id === id ? { ...d, result: { ...d.result, audioUrl } } : d));
        updateProgress(id, 100, 95);

        // 5. SEO
        updateStatus(id, ProcessingStatus.GENERATING_SEO, "Optimizing SEO...");
        const seo = await generateDiscussionSEO(discussion.topic, script, language, descriptionTail);

        setDiscussions(prev => prev.map(d => d.id === id ? { ...d, result: { ...d.result, seo, status: ProcessingStatus.COMPLETED, logs: [...d.result.logs, "Done."], completedAt: new Date(), progress: undefined } } : d));

    } catch (e: any) {
        if (e.message !== "Processing aborted by user") {
            updateStatus(id, ProcessingStatus.ERROR, `Error: ${e.message}`);
        } else {
            updateStatus(id, ProcessingStatus.IDLE, "Aborted.");
        }
    } finally {
        abortControllers.current.delete(id + '_audio');
    }
  };

  const processVideo = async (id: string) => {
    // Determine if it's a book or discussion
    const isBook = appMode === 'BOOK';
    const list = isBook ? booksRef.current : discussionsRef.current;
    const item = list.find(x => x.id === id);

    if (!item || !item.result.audioUrl || !item.videoImage) return;

    const controller = new AbortController();
    abortControllers.current.set(id + '_video', controller);
    const { signal } = controller;

    updateStatus(id, ProcessingStatus.RENDERING_VIDEO, "Rendering Video...");
    
    // Reset step progress for video
    const updater = (prev: any[]) => prev.map(x => x.id === id ? { ...x, result: { ...x.result, progress: { stepPercent: 0, totalPercent: 0, startTime: Date.now(), estimatedTotalSeconds: 60 } } } : x);
    if(isBook) setBooks(updater); else setDiscussions(updater);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ab = await (await fetch(item.result.audioUrl)).arrayBuffer();
      const audioBuffer = await decodeArrayBuffer(audioCtx, ab);

      if (signal.aborted) throw new Error("Aborted");

      const blob = await renderVideo(audioBuffer, item.videoImage, { 
        renderWaveform: item.renderWaveform, 
        codec: item.videoCodec, 
        onProgress: (p) => updateProgress(id, p, p)
      });
      
      if (signal.aborted) throw new Error("Aborted");
      
      const completeUpdater = (prev: any[]) => prev.map(x => x.id === id ? { ...x, result: { ...x.result, videoUrl: URL.createObjectURL(blob), status: ProcessingStatus.COMPLETED, logs: [...x.result.logs, "Video ready."], progress: undefined } } : x);
      if(isBook) setBooks(completeUpdater); else setDiscussions(completeUpdater);

    } catch (e: any) {
       if (e.message !== "Aborted") updateStatus(id, ProcessingStatus.ERROR, `Video Error: ${e.message}`);
       else updateStatus(id, ProcessingStatus.COMPLETED, "Video aborted."); 
    } finally {
      abortControllers.current.delete(id + '_video');
    }
  };

  const previewVoice = async (id: string) => {
     if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
     if (previewStatus?.id === id) { setPreviewStatus(null); return; }

     setPreviewStatus({ id, state: 'loading' });
     try {
         const profile = getProfile(id);
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
    const list = appMode === 'BOOK' ? booksRef.current : discussionsRef.current;
    
    for (const item of list) {
        // Skip if no title/topic
        if (appMode === 'BOOK' && !(item as BookEntry).title) continue;
        if (appMode === 'DISCUSSION' && !(item as DiscussionEntry).topic) continue;

        if (item.result.status !== ProcessingStatus.COMPLETED) {
            if (appMode === 'BOOK') await processBook(item.id);
            else await processDiscussion(item.id);
        }
        
        // Refresh ref to get audioUrl
        const freshList = appMode === 'BOOK' ? booksRef.current : discussionsRef.current;
        const fresh = freshList.find(x => x.id === item.id);
        
        if (fresh?.result.audioUrl && fresh.videoImage && !fresh.result.videoUrl) await processVideo(item.id);
    }
    setIsGlobalProcessing(false);
  };

  const abort = (id: string) => {
      abortControllers.current.get(id + '_audio')?.abort();
      abortControllers.current.get(id + '_video')?.abort();
  };

  return {
    // State
    appMode, setAppMode,
    systemPrompt, setSystemPrompt, language, setLanguage, audioRules, setAudioRules,
    descriptionTail, setDescriptionTail, normalizeAudio, setNormalizeAudio, compressAudio, setCompressAudio,
    ctaFiles, books, discussions, isGlobalProcessing, previewStatus,
    // Actions
    addBook, addDiscussion, removeEntry, updateEntry, handleCtaUpload, 
    processBook, processDiscussion, processVideo, abort, automateAll, previewVoice,
    // Bulk
    generateAll: async () => {
        setIsGlobalProcessing(true);
        const list = appMode === 'BOOK' ? booksRef.current : discussionsRef.current;
        for(const item of list) {
             const hasContent = appMode === 'BOOK' ? (item as BookEntry).title : (item as DiscussionEntry).topic;
             if((item.result.status === ProcessingStatus.IDLE || item.result.status === ProcessingStatus.ERROR) && hasContent) {
                 if(appMode === 'BOOK') await processBook(item.id);
                 else await processDiscussion(item.id);
             }
        }
        setIsGlobalProcessing(false);
    },
    renderAllVideos: async () => {
        setIsGlobalProcessing(true);
        const list = appMode === 'BOOK' ? booksRef.current : discussionsRef.current;
        for(const item of list) if(item.result.status === ProcessingStatus.COMPLETED && item.result.audioUrl && item.videoImage && !item.result.videoUrl) await processVideo(item.id);
        setIsGlobalProcessing(false);
    },
    downloadAll: () => {
        const list = appMode === 'BOOK' ? booksRef.current : discussionsRef.current;
        list.forEach(item => {
            const title = appMode === 'BOOK' ? (item as BookEntry).title : (item as DiscussionEntry).topic;
            if(item.result.audioUrl) { const a = document.createElement('a'); a.href = item.result.audioUrl; a.download = `${title}.wav`; a.click(); }
            if(item.result.videoUrl) { const a = document.createElement('a'); a.href = item.result.videoUrl; a.download = `${title}.webm`; a.click(); }
        });
    }
  };
};
