import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioRecorder } from '../utils/audio-recorder';
import { AudioStreamPlayer } from '../utils/audio-player';

const HOST = 'generativelanguage.googleapis.com';
const VERSION = 'v1alpha';
const MODEL = 'models/gemini-2.0-flash'; // Updated from exp

export const useLiveAPI = ({ apiKey }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const [volume, setVolume] = useState(0); // For visualizer

    const [error, setError] = useState(null);

    // Refs to keep track of instances
    const wsRef = useRef(null);
    const recorderRef = useRef(null);
    const playerRef = useRef(null);
    const isInterruptedRef = useRef(false);
    const canSendRef = useRef(false); // New Ref for handshake gating

    // Initialize Audio Utils
    useEffect(() => {
        try {
            recorderRef.current = new AudioRecorder();
            playerRef.current = new AudioStreamPlayer();

            // Listen for recorder data and send to WS
            recorderRef.current.on('data', (pcmData) => {
                // Ensure WS is OPEN and Handshake ready
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && canSendRef.current) {
                    // pcmData is Int16Array Buffer
                    const base64Audio = arrayBufferToBase64(pcmData);

                    const msg = {
                        realtime_input: {
                            media_chunks: [
                                {
                                    mime_type: "audio/pcm",
                                    data: base64Audio
                                }
                            ]
                        }
                    };
                    wsRef.current.send(JSON.stringify(msg));

                    // Simple volume meter approximation
                    const view = new Int16Array(pcmData);
                    let sum = 0;
                    for (let i = 0; i < view.length; i += 10) sum += Math.abs(view[i]);
                    setVolume(Math.min(100, (sum / view.length) / 50));
                }
            });
        } catch (e) {
            console.error("Initialization Error", e);
            setError(`Init Error: ${e.message}`);
        }

        return () => {
            disconnect();
        };
    }, []);

    const connect = useCallback(async () => {
        canSendRef.current = false;
        setError(null);
        if (!apiKey) {
            setError("API Key missing");
            return;
        }

        try {
            // 1. Start Audio immediately (User Gesture context)
            await recorderRef.current.start();
            playerRef.current.initialize();
            setIsConnected(true); // Optimistic update

            // 2. Connect to WebSocket
            if (wsRef.current) wsRef.current.close();

            const url = `wss://${HOST}/ws/google.ai.generativelanguage.${VERSION}.GenerativeService.BidiGenerateContent?key=${apiKey}`;
            const ws = new WebSocket(url);

            ws.onopen = () => {
                console.log('UseLiveAPI: Connected');

                // Send Initial Setup
                const setupMsg = {
                    setup: {
                        model: MODEL,
                        generation_config: {
                            response_modalities: ["AUDIO"],
                            speech_config: {
                                voice_config: { prebuilt_voice_config: { voice_name: "Puck" } }
                            }
                        }
                    }
                };
                console.log("Sending Setup:", setupMsg);
                ws.send(JSON.stringify(setupMsg));


            };

            ws.onmessage = async (event) => {
                // Blob fix if WS returns binary
                let data = event.data;
                if (data instanceof Blob) {
                    data = await data.text();
                }

                try {
                    const response = JSON.parse(data);
                    console.log("RX:", response); // Debug Log

                    // Handle Setup Complete
                    if (response.setupComplete) {
                        console.log("Setup Complete!");
                        canSendRef.current = true;
                    }

                    // Handle Audio from Gemini
                    if (response.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                        const audioChunk = response.serverContent.modelTurn.parts[0].inlineData.data;
                        if (!isInterruptedRef.current) {
                            setIsTalking(true);
                            playerRef.current.addAudioChunk(audioChunk);
                        }
                    }

                    // Handle Turn Complete (End of AI speech)
                    if (response.serverContent?.turnComplete) {
                        setIsTalking(false);
                        isInterruptedRef.current = false;
                    }
                } catch (e) {
                    console.error("Parse Error", e);
                }
            };

            ws.onclose = (e) => {
                console.log('UseLiveAPI: Disconnected', e.code, e.reason);
                setIsConnected(false);
                setIsTalking(false);
                stopAudio();
                if (e.code !== 1000 && e.code !== 1005) {
                    setError(`Disconnected ${e.code}: ${e.reason || 'Unknown'}`);
                }
            };

            ws.onerror = (err) => {
                console.error("WS Error", err);
                setIsConnected(false);
                stopAudio();
                setError("WebSocket Connection Failed");
            };

            wsRef.current = ws;

        } catch (error) {
            console.error("Connection Failed", error);
            setIsConnected(false);
            stopAudio();
            setError(`Connection Failed: ${error.message}`);
        }
    }, [apiKey]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        stopAudio();
    }, []);

    const stopAudio = () => {
        if (recorderRef.current) recorderRef.current.stop();
        if (playerRef.current) playerRef.current.reset();
        setIsTalking(false);
        setVolume(0);
    };

    return {
        connect,
        disconnect,
        isConnected,
        isTalking,
        volume,
        error
    };
};

// Helper: ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
