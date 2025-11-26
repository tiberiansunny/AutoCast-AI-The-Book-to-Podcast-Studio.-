
/**
 * Decodes a base64 string (Raw PCM from Gemini TTS) into an AudioBuffer
 * Gemini TTS returns raw PCM 24kHz mono (Int16)
 */
export const decodeBase64Audio = async (
  ctx: AudioContext,
  base64Data: string
): Promise<AudioBuffer> => {
  // 1. Decode Base64 string to binary string
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 2. Convert raw PCM bytes (Int16) to AudioBuffer
  // Gemini TTS uses 24000Hz sample rate, 1 channel
  const sampleRate = 24000; 
  const numChannels = 1;
  
  // Create Int16 view of the data
  const dataInt16 = new Int16Array(bytes.buffer);
  const frameCount = dataInt16.length / numChannels;
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }

  return buffer;
};

/**
 * Decodes an ArrayBuffer (from file upload) into an AudioBuffer
 * Uses browser native decoding for standard files (MP3, WAV)
 */
export const decodeArrayBuffer = async (
  ctx: AudioContext,
  arrayBuffer: ArrayBuffer
): Promise<AudioBuffer> => {
  // We copy the buffer because decodeAudioData detaches it
  const bufferCopy = arrayBuffer.slice(0);
  return await ctx.decodeAudioData(bufferCopy);
};

/**
 * Creates a silence buffer of specified duration
 */
export const createSilenceBuffer = (
  ctx: AudioContext,
  durationSeconds: number,
  sampleRate: number = 24000
): AudioBuffer => {
  return ctx.createBuffer(1, sampleRate * durationSeconds, sampleRate);
};

/**
 * Resamples an AudioBuffer to a target sample rate using OfflineAudioContext.
 * Critical for mixing 44.1/48kHz CTA files with 24kHz Gemini TTS audio.
 * Prevents "chipmunk" or "slow-mo" effects.
 */
export const resampleBuffer = async (
  sourceBuffer: AudioBuffer, 
  targetSampleRate: number
): Promise<AudioBuffer> => {
  if (sourceBuffer.sampleRate === targetSampleRate) return sourceBuffer;

  // Use OfflineAudioContext to check support (standard)
  const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtx) {
    throw new Error("OfflineAudioContext not supported");
  }

  // Calculate new length, use Math.ceil to ensure we don't drop a frame fraction
  const newLength = Math.ceil(sourceBuffer.duration * targetSampleRate);

  const offlineCtx = new OfflineCtx(
    sourceBuffer.numberOfChannels,
    newLength,
    targetSampleRate
  );

  const bufferSource = offlineCtx.createBufferSource();
  bufferSource.buffer = sourceBuffer;
  bufferSource.connect(offlineCtx.destination);
  bufferSource.start(0);

  return await offlineCtx.startRendering();
};

/**
 * Concatenates two AudioBuffers (TTS + CTA)
 * Assumes buffers have the same sample rate (caller must ensure this via resampleBuffer)
 */
export const concatenateAudioBuffers = (
  ctx: AudioContext,
  buffers: (AudioBuffer | null)[]
): AudioBuffer => {
  const validBuffers = buffers.filter(b => b !== null) as AudioBuffer[];
  if (validBuffers.length === 0) return ctx.createBuffer(1, 1, 24000);
  if (validBuffers.length === 1) return validBuffers[0];

  const numberOfChannels = Math.max(...validBuffers.map(b => b.numberOfChannels));
  const totalLength = validBuffers.reduce((acc, b) => acc + b.length, 0);
  const sampleRate = validBuffers[0].sampleRate; 

  const tmpBuffer = ctx.createBuffer(numberOfChannels, totalLength, sampleRate);

  let offset = 0;
  for (const buf of validBuffers) {
    for (let i = 0; i < numberOfChannels; i++) {
      const channel = tmpBuffer.getChannelData(i);
      // If buffer has this channel, copy it. If not (mono mixed into stereo), copy channel 0.
      if (i < buf.numberOfChannels) {
        channel.set(buf.getChannelData(i), offset);
      } else if (buf.numberOfChannels === 1) {
        channel.set(buf.getChannelData(0), offset);
      }
    }
    offset += buf.length;
  }
  return tmpBuffer;
};

/**
 * Applies Dynamics Compression and Normalization to an AudioBuffer
 * This is the "Mastering" phase.
 * 1. Compression: Reduces dynamic range to make audio sound louder and more consistent (Broadcast style).
 * 2. Normalization: Raises the overall volume to near-peak (0dB) without clipping.
 */
export const applyAudioPostProcessing = async (
  sourceBuffer: AudioBuffer,
  normalize: boolean,
  compress: boolean
): Promise<AudioBuffer> => {
  if (!normalize && !compress) return sourceBuffer;

  const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineCtx(
    sourceBuffer.numberOfChannels,
    sourceBuffer.length,
    sourceBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = sourceBuffer;

  let endNode: AudioNode = source;

  // 1. Compression Chain
  if (compress) {
    const compressor = offlineCtx.createDynamicsCompressor();
    // Soft compression settings for spoken word
    compressor.threshold.setValueAtTime(-18, 0); // Start compressing at -18dB
    compressor.knee.setValueAtTime(30, 0); // Soft knee
    compressor.ratio.setValueAtTime(3, 0); // 3:1 ratio (gentle to medium)
    compressor.attack.setValueAtTime(0.003, 0); // Fast attack
    compressor.release.setValueAtTime(0.25, 0); // Medium release
    
    endNode.connect(compressor);
    endNode = compressor;
  }

  endNode.connect(offlineCtx.destination);
  source.start(0);

  let renderedBuffer = await offlineCtx.startRendering();

  // 2. Normalization (Manual Peak Scaling)
  if (normalize) {
    // Determine max peak
    let maxPeak = 0;
    for (let i = 0; i < renderedBuffer.numberOfChannels; i++) {
      const channelData = renderedBuffer.getChannelData(i);
      for (let j = 0; j < channelData.length; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > maxPeak) maxPeak = abs;
      }
    }

    // Target -1.0dB = 0.891, let's go for -0.5dB ~ 0.94
    const targetLevel = 0.98; 
    if (maxPeak > 0 && maxPeak < targetLevel) {
      const gain = targetLevel / maxPeak;
      for (let i = 0; i < renderedBuffer.numberOfChannels; i++) {
        const channelData = renderedBuffer.getChannelData(i);
        for (let j = 0; j < channelData.length; j++) {
          channelData[j] *= gain;
        }
      }
    }
  }

  return renderedBuffer;
};

/**
 * Encodes AudioBuffer to WAV format (Blob) for download
 */
export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result: Float32Array;
  if (numChannels === 2) {
      result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
      result = buffer.getChannelData(0);
  }

  return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
};

function interleave(inputL: Float32Array, inputR: Float32Array) {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);

  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function encodeWAV(samples: Float32Array, format: number, sampleRate: number, numChannels: number, bitDepth: number) {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * bytesPerSample, true);

  if (bitDepth === 16) {
      floatTo16BitPCM(view, 44, samples);
  } else {
      floatTo32BitPCM(view, 44, samples);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function floatTo32BitPCM(output: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 4) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt32(offset, s * 2147483647, true);
    }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
