import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeech = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setTranscript(finalTranscript);
                    setError(null);
                }
            };

            recognitionRef.current.onerror = (event) => {
                // Ignore 'no-speech' errors as they are common and not fatal
                if (event.error !== 'no-speech') {
                    console.error('Speech recognition error', event.error);
                    setError(`Microphone Error: ${event.error}`);
                    setIsListening(false);
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        } else {
            console.warn("Web Speech API not supported");
            setIsSupported(false);
            setError("Browser not supported. Please use Chrome, Edge, or Safari.");
        }
    }, []);

    const startListening = useCallback((lang = 'en-US') => {
        setError(null);
        if (!isSupported) {
            setError("Browser not supported. Please use Chrome, Edge, or Safari.");
            return;
        }
        if (recognitionRef.current) {
            recognitionRef.current.lang = lang;
            try {
                recognitionRef.current.start();
                setIsListening(true);
                setTranscript('');
            } catch (e) {
                console.error(e);
                setError("Could not start microphone.");
            }
        }
    }, [isSupported]);

    // ... rest of code (stopListening, speak) ...

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    const speak = useCallback((text, lang = 'es-ES') => {
        if ('speechSynthesis' in window) {
            // Cancel any current speaking first
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 1;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    const cancelSpeech = useCallback(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }, []);

    // Cleanup on unmount to stop speaking (fixes refresh issue)
    // Cleanup on unmount to stop speaking (fixes refresh issue)
    useEffect(() => {
        // Cancel speech immediately on mount to clear any zombie audio from previous loads
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        const handleUnload = () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        speak,
        cancelSpeech,
        error,
        isSupported
    };
};
