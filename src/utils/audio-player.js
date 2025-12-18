export class AudioStreamPlayer {
    constructor(sampleRate = 24000) {
        this.sampleRate = sampleRate; // Gemini usually outputs 24kHz
        this.audioContext = null;
        this.nextStartTime = 0;
        this.isPlaying = false;
        this.queue = [];
    }

    initialize() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate,
            });
        }
    }

    reset() {
        this.queue = [];
        this.isPlaying = false;
        if (this.audioContext) {
            // Close old context to stop immediately and start fresh
            this.audioContext.close();
            this.audioContext = null;
        }
        this.nextStartTime = 0;
    }

    addAudioChunk(base64String) {
        this.initialize();

        // Convert base64 to Float32Array
        const binaryString = atob(base64String);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // PCM 16-bit LE to Float32
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }

        const buffer = this.audioContext.createBuffer(1, float32Array.length, this.sampleRate);
        buffer.getChannelData(0).set(float32Array);

        this.scheduleBuffer(buffer);
    }

    scheduleBuffer(buffer) {
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);

        // Ensure we schedule in the future, handling gaps if we fell behind
        const currentTime = this.audioContext.currentTime;
        if (this.nextStartTime < currentTime) {
            this.nextStartTime = currentTime; // Reset if we lagged
        }

        source.start(this.nextStartTime);
        this.nextStartTime += buffer.duration;
    }
}
