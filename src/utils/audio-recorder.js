// Simple EventEmitter implementation to avoid minimal dependency issues
class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, listener) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(listener);
    }

    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(...args));
        }
    }
}

export class AudioRecorder extends EventEmitter {
    constructor() {
        super();
        this.sampleRate = 16000; // Targeted rate
        this.stream = null;
        this.audioContext = null;
        this.source = null;
        this.processor = null;
    }

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 1. Create Native Context (e.g., 44.1k or 48k)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const sourceSampleRate = this.audioContext.sampleRate;
            this.sampleRate = 16000; // API Target Rate

            console.log(`AudioRecorder: Input Rate ${sourceSampleRate}Hz -> Downsampling to 16000Hz`);

            // 2. Worklet with Manual Downsampling Logic
            // We use simple decimation (skipping samples) which is "good enough" for speech
            const workletCode = `
              class PCMProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.bufferSize = 2048; // Send chunks of ~128ms
                    this.buffer = new Int16Array(this.bufferSize);
                    this.bufferIndex = 0;
                }

                process(inputs, outputs, parameters) {
                  const input = inputs[0];
                  if (input.length > 0) {
                    const float32Data = input[0];
                    const targetRate = 16000;
                    const sourceRate = ${sourceSampleRate};
                    const ratio = sourceRate / targetRate;
                    
                    // Downsample
                    for (let i = 0; i < float32Data.length; i += ratio) {
                       // Nearest neighbor interpolation (simple index rounding)
                       const idx = Math.floor(i);
                       if (idx >= float32Data.length) break;
                       
                       const sample = Math.max(-1, Math.min(1, float32Data[idx]));
                       
                       // Convert to Int16
                       this.buffer[this.bufferIndex++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                       
                       // Flush if full
                       if (this.bufferIndex >= this.bufferSize) {
                           this.port.postMessage(this.buffer.slice(0, this.bufferSize).buffer, [this.buffer.slice(0, this.bufferSize).buffer]);
                           this.bufferIndex = 0;
                       }
                    }
                  }
                  return true;
                }
              }
              registerProcessor('pcm-processor', PCMProcessor);
            `;

            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            await this.audioContext.audioWorklet.addModule(url);

            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.processor = new AudioWorkletNode(this.audioContext, 'pcm-processor');

            this.processor.port.onmessage = (e) => {
                this.emit('data', e.data);
            };

            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
        } catch (error) {
            console.error('Error starting audio recording:', error);
            throw error;
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.processor) {
            this.processor.disconnect();
            this.processor.port.close();
        }
        if (this.source) {
            this.source.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}
