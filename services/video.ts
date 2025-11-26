
import { readPsd } from 'ag-psd';
import { VideoCodec } from '../types';

/**
 * Renders an AudioBuffer + Image into a Video Blob (WebM/MP4)
 * Uses Real-time MediaRecorder with a Canvas stream.
 * 
 * Workflow:
 * 1. Create Canvas & Draw Image
 * 2. Setup Audio Graph (Source -> Destination & Analyser)
 * 3. Setup MediaRecorder (Canvas Stream + Audio Stream)
 * 4. Loop: Draw Frame (Waveform) -> RequestAnimationFrame
 */
export const renderVideo = async (
    audioBuffer: AudioBuffer,
    imageFile: File,
    options: { 
        renderWaveform: boolean; 
        codec: VideoCodec;
        onProgress?: (percent: number) => void 
    }
  ): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        // 1. Prepare Canvas (1080p)
        const canvas = document.createElement('canvas');
        const width = 1920; 
        const height = 1080;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
  
        // 2. Load Image (Support PSD or Standard)
        let imgBitmap: ImageBitmap | HTMLCanvasElement;
        
        if (imageFile.name.toLowerCase().endsWith('.psd')) {
            // Handle PSD
            const arrayBuffer = await imageFile.arrayBuffer();
            const psd = readPsd(arrayBuffer);
            
            // ag-psd returns pixel data in psd.image (Uint8ClampedArray) if available
            // We need to put this onto a canvas
            const pixelData = (psd as any).image;

            if (pixelData) {
                const imageData = new ImageData(pixelData, psd.width, psd.height);
                const psdCanvas = document.createElement('canvas');
                psdCanvas.width = psd.width;
                psdCanvas.height = psd.height;
                const psdCtx = psdCanvas.getContext('2d');
                if (!psdCtx) throw new Error("Failed to create PSD canvas context");
                
                psdCtx.putImageData(imageData, 0, 0);
                imgBitmap = psdCanvas;
            } else if (psd.canvas) {
                // In some environments/builds ag-psd might return a canvas
                imgBitmap = psd.canvas as unknown as HTMLCanvasElement;
            } else {
                 throw new Error("PSD parsing failed: No image data found.");
            }
        } else {
            // Standard Image
            imgBitmap = await createImageBitmap(imageFile);
        }

        // Calculate Scaling (Object-fit: COVER / Fill Screen)
        const imgWidth = 'width' in imgBitmap ? imgBitmap.width : (imgBitmap as HTMLCanvasElement).width;
        const imgHeight = 'height' in imgBitmap ? imgBitmap.height : (imgBitmap as HTMLCanvasElement).height;

        const scale = Math.max(width / imgWidth, height / imgHeight);
        const drawWidth = imgWidth * scale;
        const drawHeight = imgHeight * scale;
        
        // Center the image
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;
  
        // 3. Setup Audio Graph
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const destination = audioCtx.createMediaStreamDestination();
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
  
        source.connect(destination);
        
        // Optional: Analyser for waveform
        let analyser: AnalyserNode | null = null;
        let dataArray: Uint8Array | null = null;
  
        if (options.renderWaveform) {
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 2048;
          const bufferLength = analyser.frequencyBinCount;
          dataArray = new Uint8Array(bufferLength);
          source.connect(analyser);
        }
  
        // 4. Setup MediaRecorder
        const stream = canvas.captureStream(30); // 30 FPS
        const audioTrack = destination.stream.getAudioTracks()[0];
        stream.addTrack(audioTrack);
        
        // Codec Selection (Hardware Acceleration Hint)
        let mimeType = 'video/webm';
        if (options.codec === 'vp9' && MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
            mimeType = 'video/webm; codecs=vp9';
        } else if (options.codec === 'h264' && MediaRecorder.isTypeSupported('video/webm; codecs=h264')) {
            mimeType = 'video/webm; codecs=h264';
        } else if (options.codec === 'av1' && MediaRecorder.isTypeSupported('video/webm; codecs=av1')) {
            mimeType = 'video/webm; codecs=av1';
        }

        const recorder = new MediaRecorder(stream, { 
          mimeType,
          videoBitsPerSecond: 8000000 // 8 Mbps for 1080p
        });
  
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
  
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
          source.disconnect();
          audioCtx.close();
          resolve(blob);
        };
  
        recorder.onerror = (e) => {
          reject(e);
        };
  
        // 5. Animation Loop
        let animationId: number;
        const initialTime = audioCtx.currentTime; 
        const duration = audioBuffer.duration;
  
        const draw = () => {
           // Clear
           ctx.fillStyle = '#000000';
           ctx.fillRect(0, 0, width, height);

           // Draw Image (Centered & Scaled to Cover)
           ctx.drawImage(imgBitmap, x, y, drawWidth, drawHeight);
  
           // Draw Waveform
           if (options.renderWaveform && analyser && dataArray) {
             analyser.getByteTimeDomainData(dataArray);
             ctx.lineWidth = 3;
             ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
             ctx.beginPath();
             
             const sliceWidth = width / dataArray.length;
             let wx = 0;
             for (let i = 0; i < dataArray.length; i++) {
               const v = dataArray[i] / 128.0;
               const wy = (v * (height / 4)) + (height * 0.75); 
               
               if (i === 0) ctx.moveTo(wx, wy);
               else ctx.lineTo(wx, wy);
               wx += sliceWidth;
             }
             ctx.stroke();
           }
  
           // Progress check
           if (options.onProgress) {
             const elapsed = audioCtx.currentTime - initialTime;
             const percent = Math.min(100, (elapsed / duration) * 100);
             options.onProgress(percent);
           }
  
           animationId = requestAnimationFrame(draw);
        };
  
        // 6. Start Recording
        recorder.start();
        source.start();
        draw();
  
        // Stop automatically when audio ends
        source.onended = () => {
           cancelAnimationFrame(animationId);
           recorder.stop();
        };
  
      } catch (err) {
        reject(err);
      }
    });
  };
