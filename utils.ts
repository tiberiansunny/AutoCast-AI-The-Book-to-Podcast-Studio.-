import { BookEntry, VoiceProfile } from './types';
import { VOICE_PROFILES as PROFILES_DATA } from './config';

export const getProfile = (id: string): VoiceProfile => PROFILES_DATA.find(p => p.id === id) || PROFILES_DATA[0];

export const formatTimestamp = (seconds: number) => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `[${pad(h)}:${pad(m)}:${pad(s)}]`;
};

export const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const getDownloadFilename = (book: BookEntry, ext: 'wav' | 'webm') => {
  const dateObj = book.result.completedAt || new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hours = pad(dateObj.getHours());
  const minutes = pad(dateObj.getMinutes());
  const seconds = pad(dateObj.getSeconds());
  
  const safeTitle = book.title.trim().replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}_${safeTitle}.${ext}`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy', err);
    return false;
  }
};