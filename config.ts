
import { VoiceProfile, VideoCodec } from './types';

export const APP_NAME = "AutoCast AI";
export const APP_TAGLINE = "Book-to-Podcast Studio";

export const DEFAULT_SYSTEM_PROMPT = `Role: You are a precise Literary Archive Agent and Podcast Narrator. Your task is to process the full text of a book and generate a spoken-word script summary.

Input Data:
Source Text: The full text of the book (provided by user).
Target Duration: [X] Minutes.

Strict Operational Constraints (Non-Negotiable):
1. Source Truth: You must rely ONLY on the provided text. Do not use external knowledge.
2. No Hallucinations: Do not invent scenarios or dialogue not found in the book.
3. Direct Speech Dominance: Your script must consist primarily of the author's original wording.
4. Natural Adaptation: You may only add "connective tissue" words to make the text flow naturally.`;

export const DEFAULT_AUDIO_RULES = `Start generation with the spoken phrase: "Summary of [Book Name] by [Author]. Introduction." 
Create a short description of the book with few paragraphs.
Continue with the spoken phrase: "Chapter [number]" followed by the chapter's main ideas. You must pronounce the Chapter number (e.g. "Chapter One", "Chapter Two") sequentially for each chapter.
Finish with the spoken phrase: "Final Summary." and final summary of this book`;

export const DEFAULT_DESCRIPTION_TAIL = `___

Support this Channel ko-fi.com/bonaideapro or https://send.monobank.ua/jar/6iPbbAAWwe

Join Telegram Channel https://t.me/top_free_audiobooks

Join Reddit https://www.reddit.com/r/free_audiobooks_on_YT/

Editing Software https://amzn.to/3DhVUfI or https://amzn.to/44QtvsR

PC for Video Editing https://amzn.to/3rramPO

___

PS: This book summary is meant as a preview and not a replacement for the original work. If you like this summary please consider purchasing the original book to get the full experience as the original author intended it to be. If you are the original author and want us to remove it, please contact us.`;

export const WEIGHTS = {
  SEARCH: 5,
  SCRIPT: 5,
  AUDIO: 80,
  MIX: 10
};

export const EMOTIONS = ['Neutral', 'Enthusiastic', 'Serious', 'Storyteller', 'Soothing', 'Curious', 'Authoritative'];
export const SPEEDS = ['Normal', 'Slow', 'Fast'];
export const LANGUAGES = ['English', 'Ukrainian', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Polish', 'Dutch', 'Turkish', 'Japanese', 'Korean', 'Chinese'];
export const CODECS: VideoCodec[] = ['vp9', 'h264', 'av1'];

export const VOICE_PROFILES: VoiceProfile[] = [
  { id: 'Elena', name: 'Elena', gender: 'Female', age: 'Young', style: 'Social media', geminiMapping: 'Zephyr' },
  { id: 'Jade', name: 'Jade', gender: 'Female', age: 'Young', style: 'Conversational', geminiMapping: 'Kore' },
  { id: 'Sophie', name: 'Sophie', gender: 'Female', age: 'Young', style: 'News', geminiMapping: 'Aoede' },
  { id: 'Matt', name: 'Matt', gender: 'Male', age: 'Young', style: 'Social media', geminiMapping: 'Puck' },
  { id: 'Amara', name: 'Amara', gender: 'Female', age: 'Middle-aged', style: 'Social media', geminiMapping: 'Zephyr' },
  { id: 'Benjamin', name: 'Benjamin', gender: 'Male', age: 'Young', style: 'Conversational', geminiMapping: 'Puck' },
  { id: 'Maya', name: 'Maya', gender: 'Female', age: 'Middle-aged', style: 'Narration', geminiMapping: 'Aoede' },
  { id: 'Colin', name: 'Colin', gender: 'Male', age: 'Middle-aged', style: 'Conversational', geminiMapping: 'Fenrir' },
  { id: 'Logan', name: 'Logan', gender: 'Male', age: 'Young', style: 'Narration', geminiMapping: 'Charon' },
  { id: 'Wyatt', name: 'Wyatt', gender: 'Male', age: 'Young', style: 'Advertisement', geminiMapping: 'Puck' },
  { id: 'Lydia', name: 'Lydia', gender: 'Female', age: 'Middle-aged', style: 'Narration', geminiMapping: 'Aoede' },
  { id: 'Jessica', name: 'Jessica', gender: 'Female', age: 'Young', style: 'Advertisement', geminiMapping: 'Kore' },
  { id: 'Allison', name: 'Allison', gender: 'Female', age: 'Old', style: 'News', geminiMapping: 'Aoede' },
  { id: 'William', name: 'William', gender: 'Male', age: 'Old', style: 'Narration', geminiMapping: 'Fenrir' },
  { id: 'Sarah', name: 'Sarah', gender: 'Female', age: 'Young', style: 'Social media', geminiMapping: 'Zephyr' },
  { id: 'Rowan', name: 'Rowan', gender: 'Non-binary', age: 'Middle-aged', style: 'Social media', geminiMapping: 'Puck' },
  { id: 'Abhi', name: 'Abhi', gender: 'Male', age: 'Middle-aged', style: 'Social media', geminiMapping: 'Charon' },
  { id: 'Martin', name: 'Martin', gender: 'Male', age: 'Middle-aged', style: 'Advertisement', geminiMapping: 'Fenrir' },
  { id: 'Blake', name: 'Blake', gender: 'Male', age: 'Middle-aged', style: 'Narration', geminiMapping: 'Fenrir' },
  { id: 'Sandra', name: 'Sandra', gender: 'Female', age: 'Young', style: 'Advertisement', geminiMapping: 'Kore' },
  { id: 'Larissa', name: 'Larissa', gender: 'Female', age: 'Young', style: 'Social media', geminiMapping: 'Zephyr' },
  { id: 'Carla', name: 'Carla', gender: 'Female', age: 'Young', style: 'Narration', geminiMapping: 'Aoede' },
  { id: 'Stefan', name: 'Stefan', gender: 'Male', age: 'Middle-aged', style: 'Narration', geminiMapping: 'Charon' },
  { id: 'Leo', name: 'Leo', gender: 'Male', age: 'Young', style: 'Advertisement', geminiMapping: 'Puck' },
  { id: 'Mel', name: 'Mel', gender: 'Female', age: 'Young', style: 'Conversational', geminiMapping: 'Kore' },
  { id: 'Cooper', name: 'Cooper', gender: 'Non-binary', age: 'Young', style: 'Conversational', geminiMapping: 'Puck' },
  { id: 'David', name: 'David', gender: 'Male', age: 'Middle-aged', style: 'News', geminiMapping: 'Fenrir' },
  { id: 'Amelia', name: 'Amelia', gender: 'Female', age: 'Young', style: 'Social media', geminiMapping: 'Zephyr' },
];
