
export enum ProcessingStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING', // Searching/Researching
  SCRIPTING = 'SCRIPTING', // Writing the script
  GENERATING_AUDIO = 'GENERATING_AUDIO', // TTS
  MIXING = 'MIXING', // Adding CTA
  GENERATING_SEO = 'GENERATING_SEO', // Creating Title/Tags
  RENDERING_VIDEO = 'RENDERING_VIDEO', // Generating Video
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type VideoCodec = 'vp9' | 'h264' | 'av1';

export interface CtaFile {
  id: string;
  name: string;
  file: File;
  buffer: ArrayBuffer;
}

export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Non-binary';
  age: 'Young' | 'Middle-aged' | 'Old';
  style: 'Social media' | 'Conversational' | 'News' | 'Narration' | 'Advertisement';
  geminiMapping: string; // Maps to actual Gemini voice (Puck, Charon, etc.)
}

export interface BookInput {
  id: string;
  title: string;
  durationMinutes: number;
  voiceProfileId: string; // changed from voiceName to link to VoiceProfile
  emotion: string;
  speed: string;
  ctaId: string | null; // ID of the uploaded CTA file
  videoImage: File | null;
  renderWaveform: boolean;
  videoCodec: VideoCodec; // New field
}

export interface GeneratedSeo {
  title: string;
  description: string;
  tags: string[];
}

export interface ProcessingProgress {
  stepPercent: number; // 0-100 for current phase
  totalPercent: number; // 0-100 for overall job
  startTime: number; // Date.now()
  estimatedTotalSeconds: number; // Dynamic calculation
}

export interface BookResult {
  script: string;
  audioUrl: string | null;
  videoUrl: string | null;
  seo: GeneratedSeo | null;
  logs: string[];
  status: ProcessingStatus;
  progress?: ProcessingProgress; // Added progress tracking
  errorMessage?: string;
  completedAt?: Date;
}

// Combined type for state management
export interface BookEntry extends BookInput {
  result: BookResult;
}

export interface Section {
  title: string;
  content: string;
}

export const EMOTIONS = ['Neutral', 'Enthusiastic', 'Serious', 'Storyteller', 'Soothing', 'Curious', 'Authoritative'];
export const SPEEDS = ['Normal', 'Slow', 'Fast'];
export const LANGUAGES = ['English', 'Ukrainian', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Polish', 'Dutch', 'Turkish', 'Japanese', 'Korean', 'Chinese'];
export const CODECS: VideoCodec[] = ['vp9', 'h264', 'av1'];
