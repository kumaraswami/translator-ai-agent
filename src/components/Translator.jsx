import React, { useState, useEffect } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { useLiveAPI } from '../hooks/useLiveAPI';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Mic, MicOff, Languages, Sparkles, Settings, Volume2, Square, Phone, PhoneOff, Activity } from 'lucide-react';

const LANGUAGES = [
    { code: 'en-US', name: 'English', voice: 'en-US' },
    { code: 'es-ES', name: 'Spanish', voice: 'en-ES' },
    { code: 'fr-FR', name: 'French', voice: 'fr-FR' },
    { code: 'de-DE', name: 'German', voice: 'de-DE' },
    { code: 'ja-JP', name: 'Japanese', voice: 'ja-JP' },
    { code: 'hi-IN', name: 'Hindi', voice: 'hi-IN' },
    { code: 'ta-IN', name: 'Tamil', voice: 'ta-IN' },
];

export const Translator = () => {
    const [apiKey, setApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
    const [modelName, setModelName] = useState('gemini-2.0-flash');
    const [showSettings, setShowSettings] = useState(false);
    const [sourceLang, setSourceLang] = useState(LANGUAGES[0]);
    const [targetLang, setTargetLang] = useState(LANGUAGES[1]);
    const [translation, setTranslation] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);

    // Modes: 'classic' | 'live'
    const [mode, setMode] = useState('classic');

    // Hooks
    const speech = useSpeech();
    const live = useLiveAPI({ apiKey });

    // Debounce translation trigger (Classic Mode)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mode === 'classic' && speech.transcript && !speech.isListening) {
                handleTranslate();
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [speech.transcript, speech.isListening, mode]);

    const handleTranslate = async (retryCount = 0) => {
        if (!speech.transcript || !apiKey) return;
        setIsTranslating(true);
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });
            const prompt = `Act as a professional translator. Translate the following text from ${sourceLang.name} to ${targetLang.name}:\n"${speech.transcript}"\nReturn ONLY the translated text.`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            setTranslation(text);
            speech.speak(text, targetLang.voice);
            setIsTranslating(false);
        } catch (error) {
            console.error("Translation Error:", error);
            if (error.message.includes('429') && retryCount < 3) {
                const waitTime = (retryCount + 1) * 6000;
                setTranslation(`Rate limit hit. Retrying in ${waitTime / 1000}s...`);
                setTimeout(() => handleTranslate(retryCount + 1), waitTime);
            } else {
                setTranslation(`Error: ${error.message}`);
                setIsTranslating(false);
            }
        }
    };

    const toggleListening = () => {
        if (speech.isListening) {
            speech.stopListening();
        } else {
            setTranslation('');
            speech.startListening(sourceLang.code);
        }
    };

    const toggleLiveConnection = () => {
        if (live.isConnected) {
            live.disconnect();
        } else {
            live.connect();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-900 to-gray-800 text-white font-sans overflow-hidden">

            {/* Error Banner */}
            {(speech.error || !speech.isSupported) && mode === 'classic' && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg z-50 animate-bounce">
                    {speech.error || "Browser not supported"}
                </div>
            )}

            {/* Header */}
            <div className="absolute top-6 left-6 flex items-center gap-2 opacity-80 z-10">
                <Sparkles className="text-cyan-400" size={24} />
                <h1 className="text-xl font-bold tracking-wider">LIVE AGENT</h1>
                <div className="flex gap-2 ml-4 bg-white/5 rounded-full p-1">
                    <button
                        onClick={() => setMode('classic')}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${mode === 'classic' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        TEXT
                    </button>
                    <button
                        onClick={() => setMode('live')}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${mode === 'live' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        VOICE
                    </button>
                </div>
            </div>

            {/* Settings Toggle */}
            <button onClick={() => setShowSettings(!showSettings)} className="absolute top-6 right-6 z-50 p-2 rounded-full hover:bg-white/10 transition-colors">
                <Settings size={20} className="text-gray-300" />
            </button>

            {/* Settings Panel */}
            {showSettings && (
                <div className="absolute top-16 right-6 z-50 bg-black/90 backdrop-blur-md p-4 rounded-lg border border-white/10 w-80 shadow-2xl">
                    <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Configuration</h3>
                    <div className="mb-3">
                        <label className="text-xs text-gray-500 mb-1 block">API Key</label>
                        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-400" />
                    </div>
                    <div className="mb-3">
                        <label className="text-xs text-gray-500 mb-1 block">Model Name</label>
                        <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-400" />
                        <div className="flex gap-2 mt-1 flex-wrap">
                            <button onClick={() => setModelName('gemini-2.0-flash-exp')} className="text-[10px] bg-white/10 px-2 rounded hover:bg-white/20">2.0 Flash (Exp)</button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">* Live Mode requires gemini-2.0-flash-exp</p>
                    </div>
                </div>
            )}

            {/* CLASSIC MODE UI */}
            {mode === 'classic' && (
                <>
                    <div className="relative mb-12">
                        <div className={`w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${speech.isListening ? 'border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.5)] scale-110' : 'border-gray-600 shadow-none'}`}>
                            <div className={`w-32 h-32 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 opacity-80 backdrop-blur-md transition-transform duration-1000 ${isTranslating ? 'animate-pulse' : ''}`}></div>
                        </div>
                        <div className="absolute -bottom-10 left-0 right-0 text-center text-sm font-light tracking-widest uppercase text-cyan-200/80">
                            {speech.isListening ? 'Listening...' : isTranslating ? 'Translating...' : 'Ready'}
                        </div>
                    </div>

                    <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6 glass-panel rounded-2xl p-6 relative">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <select className="bg-transparent text-cyan-400 font-semibold focus:outline-none cursor-pointer" value={sourceLang.code} onChange={(e) => setSourceLang(LANGUAGES.find(l => l.code === e.target.value))}>
                                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                                </select>
                            </div>

                            {/* Model Selector (Restored) */}
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={() => setModelName('gemini-2.0-flash')} className={`text-[10px] px-2 py-1 rounded transition-colors ${modelName === 'gemini-2.0-flash' ? 'bg-cyan-500 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-400'}`}>2.0 Flash</button>
                                <button onClick={() => setModelName('gemini-2.5-flash')} className={`text-[10px] px-2 py-1 rounded transition-colors ${modelName === 'gemini-2.5-flash' ? 'bg-cyan-500 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-400'}`}>2.5 Flash</button>
                                <button onClick={() => setModelName('gemini-flash-latest')} className={`text-[10px] px-2 py-1 rounded transition-colors ${modelName === 'gemini-flash-latest' ? 'bg-cyan-500 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-400'}`}>Flash Latest</button>
                            </div>

                            <div className="h-32 text-lg text-gray-300 italic p-2 rounded-lg bg-black/20 overflow-y-auto">{speech.transcript || "Speak now..."}</div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <select className="bg-transparent text-purple-400 font-semibold focus:outline-none cursor-pointer" value={targetLang.code} onChange={(e) => setTargetLang(LANGUAGES.find(l => l.code === e.target.value))}>
                                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                                </select>
                                {translation && (
                                    <div className="flex gap-2">
                                        <button onClick={() => speech.speak(translation, targetLang.voice)} className="text-gray-400 hover:text-white transition-colors" title="Replay"><Volume2 size={18} /></button>
                                        <button onClick={speech.cancelSpeech} className="text-gray-400 hover:text-red-400 transition-colors" title="Stop"><Square size={18} fill="currentColor" /></button>
                                    </div>
                                )}
                            </div>
                            <div className={`h-32 text-lg font-medium p-2 rounded-lg bg-black/20 overflow-y-auto transition-colors duration-300 ${translation ? 'text-white' : 'text-gray-500'}`}>{translation || "Translation will appear here..."}</div>
                        </div>
                        <button onClick={toggleListening} className={`absolute left-1/2 -bottom-8 transform -translate-x-1/2 p-4 rounded-full shadow-xl transition-all duration-300 ${speech.isListening ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-500/50' : 'bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/50'}`}>
                            {speech.isListening ? <MicOff size={28} /> : <Mic size={28} />}
                        </button>
                    </div>
                </>
            )}

            {/* LIVE MODE UI */}
            {mode === 'live' && (
                <div className="flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="relative mb-8">
                        {/* Visualizer Circle */}
                        <div className={`w-64 h-64 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${live.isConnected ? 'border-green-400 shadow-[0_0_80px_rgba(74,222,128,0.4)]' : 'border-gray-700'}`}>
                            {/* Central Orb */}
                            <div
                                className={`rounded-full bg-gradient-to-tr from-green-500 to-emerald-600 opacity-90 backdrop-blur-md transition-all duration-100 ease-out`}
                                style={{
                                    width: live.isConnected ? `${100 + live.volume}px` : '100px',
                                    height: live.isConnected ? `${100 + live.volume}px` : '100px',
                                }}
                            >
                            </div>
                        </div>
                        {/* Status Ring */}
                        {live.isConnected && (
                            <div className="absolute inset-0 rounded-full border border-green-500/30 animate-ping"></div>
                        )}
                    </div>

                    <div className="text-center mb-12">
                        <h2 className="text-2xl font-light text-white mb-2">{live.isConnected ? "Live Connection Active" : "Ready to Connect"}</h2>
                        <p className="text-gray-400 text-sm">Gemini 2.0 Flash (Experimental)</p>
                    </div>

                    {/* Connect Button */}
                    <button
                        onClick={toggleLiveConnection}
                        className={`p-6 rounded-full shadow-2xl transition-all duration-300 ${live.isConnected ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40 rotate-180' : 'bg-green-500 hover:bg-green-600 shadow-green-500/40'}`}
                    >
                        {live.isConnected ? <PhoneOff size={40} /> : <Phone size={40} />}
                    </button>

                    {/* Live Error Banner */}
                    {live.error && (
                        <div className="mt-4 bg-red-500/80 text-white px-4 py-2 rounded-lg text-sm max-w-xs animate-bounce">
                            {live.error}
                        </div>
                    )}

                    <div className="mt-8 text-xs text-gray-500 max-w-md text-center">
                        <Activity className="inline mr-2 mb-1" size={12} />
                        Full-duplex low-latency audio streaming via WebSockets
                    </div>
                </div>
            )}
        </div>
    );
};
