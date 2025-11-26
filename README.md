
# AutoCast AI: Book-to-Podcast Studio

**AutoCast AI** is a professional-grade web application that leverages Google's Gemini 2.5 AI models to transform books and text sources into fully produced audio podcasts and video assets. It automates the entire pipeline: research, scripting, voice synthesis, audio mixing, and video rendering.

## 🧠 Visual Architecture

```mermaid
graph TD
    User[User Input] -->|Book Title & Settings| Agent[Literary Agent (Gemini 2.5)]
    
    subgraph "Phase 1: Analysis & Scripting"
        Agent -->|Google Search Grounding| Research[Source Text / Research Data]
        Research -->|Strict Structure Rules| ScriptGen[Script Generation]
        ScriptGen -->|Parse Sections| Sections[Introduction / Chapters / Summary]
    end
    
    subgraph "Phase 2: Audio Synthesis"
        Sections -->|Parallel Processing| TTS[Gemini 2.5 Flash TTS]
        TTS -->|Raw PCM 24kHz| AudioEngine[Web Audio API Engine]
    end
    
    subgraph "Phase 3: Post-Processing"
        AudioEngine -->|Resample| CTAMixer[CTA / Audio Tail Mixer]
        CTAMixer -->|DynamicsCompressor| Compression[Soft Compression]
        Compression -->|GainNode| Normalization[Peak Normalization]
    end
    
    subgraph "Phase 4: Output Generation"
        Normalization -->|WAV Encode| AudioFile[Audio Podcast (.wav)]
        Normalization -->|Canvas API + MediaRecorder| VideoRender[Video Generation]
        ScriptGen -->|Timestamps| SEO[SEO Metadata Generator]
    end

    AudioFile --> Download
    VideoRender --> Download
    SEO --> UI[User Interface]
```

## 📂 Project Structure

The project follows strict MVVM and Clean Architecture principles.

*   `App.tsx` - **Entry Point & Composition Root**.
*   `hooks/usePodcastStudio.ts` - **ViewModel**. Encapsulates all application state and business logic.
*   `services/` - **Service Layer**. Contains pure, stateless logic for external APIs and heavy computing.
    *   `gemini.ts` - AI interactions (Search, Script, TTS, SEO).
    *   `audio.ts` - Web Audio API engine (Decoding, Mixing, Mastering).
    *   `video.ts` - Canvas & MediaRecorder engine (Rendering, Encoding).
*   `components/` - **View Layer**. Presentational components.
    *   `BookCard.tsx` - Orchestrator for episode cards.
    *   `BookInput.tsx` - Configuration form.
    *   `BookStatus.tsx` - Progress visualization.
    *   `BookOutput.tsx` - Results display.
    *   `GlobalSettings.tsx` - Configuration sidebar.
*   `types.ts` - **Domain Models**. Shared interfaces.
*   `config.ts` - **Configuration**. Constants, prompts, and profiles.

## ✨ Key Features

### 1. AI-Driven Content Generation
*   **Literary Agent Persona:** Uses a strict "Source Truth" system prompt to ensure summaries are accurate to the source material without hallucinations.
*   **Google Search Grounding:** Automatically researches book details, themes, and chapters if provided only a title.
*   **Structural Scripting:** Generates scripts with explicit spoken transitions (e.g., "Chapter One", "Final Summary").
*   **Multi-Language Support:** Automatically translates script structure and spoken content to 13+ languages.

### 2. Advanced Audio Engineering
*   **Multi-Voice & Multi-Lingual:** Supports 28+ distinct voice personas (Male, Female, Non-binary, various ages).
*   **Smart Mixing:** Automatically resamples uploaded Audio Tails (CTAs) to match the TTS sample rate (24kHz/44.1kHz) for seamless concatenation.
*   **Post-Processing Suite:** Built-in **Dynamics Compression** and **Peak Normalization** to ensure professional broadcast-quality loudness.
*   **Silence Insertion:** Adds natural pauses between chapters.

### 3. Video Production
*   **Browser-Based Rendering:** Generates 720p/1080p videos directly in the browser using HTML5 Canvas and `MediaRecorder` API. No backend required.
*   **PSD Support:** Native parsing of Adobe Photoshop (.psd) files for video backgrounds.
*   **Hardware Acceleration:** Supports VP9, H.264, and AV1 codecs to leverage GPU capabilities.
*   **Real-Time Waveforms:** Optional oscilloscope/waveform visualization drawn dynamically over the background image.

### 4. SEO & Metadata
*   **Smart Metadata:** Generates SEO-optimized Titles, Descriptions, and Tags in the target language.
*   **Real Timestamps:** Calculates exact timestamps based on the generated audio duration for YouTube chapters.
*   **Custom Tails:** Appends standard promotional text and links to every description.

### 5. Workflow Optimization
*   **Bulk Actions:** Generate, Render, and Download assets for multiple books simultaneously.
*   **Automation:** "Automate All" runs the full pipeline (Generate -> Render -> Download) sequentially.
*   **State Recovery:** Abort and retry individual steps without losing previous data.

## 🛠️ Tech Stack

### Frontend Core
*   **React 19:** Utilizing the latest Hook patterns and Concurrent features.
*   **TypeScript:** Strictly typed interfaces for data stability.
*   **Tailwind CSS:** Responsive, dark-mode-first UI design.

### Artificial Intelligence
*   **@google/genai SDK:** Direct interaction with Gemini models.
*   **Gemini 2.5 Flash:** Used for high-speed reasoning, research, and scripting.
*   **Gemini 2.5 Flash TTS:** Used for high-quality, low-latency speech synthesis.

### Audio & Video Engineering
*   **Web Audio API:** `OfflineAudioContext`, `DynamicsCompressorNode`.
*   **Canvas API:** Used for composing video frames.
*   **MediaStream Recording API:** Captures video blobs.
*   **ag-psd:** Library for parsing Photoshop files in the browser.

---

**Created by [bonaidea.pro](https://bonaidea.pro)**
