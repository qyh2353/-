/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Eraser, 
  Palette, 
  Wand2, 
  Download, 
  Languages, 
  Settings,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  ExternalLink,
  Send,
  Trash2,
  ChevronDown,
  Loader2,
  Layers
} from 'lucide-react';
import { translations, Language } from './translations';
import { SAMPLES, SampleMedia } from './constants';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type Tab = 'filter' | 'watermark' | 'chat';

type ThemeId = 'orange' | 'cyberpunk' | 'emerald' | 'midnight' | 'rose';

type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface BatchItem {
  id: string;
  file: File;
  url: string;
  type: 'image' | 'video';
  status: BatchStatus;
  result?: any;
  error?: string;
}

interface ThemeConfig {
  id: ThemeId;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  shadow: string;
}

const themes: ThemeConfig[] = [
  {
    id: 'orange',
    name: 'Sunset Orange',
    primary: 'orange-500',
    secondary: 'pink-600',
    accent: 'orange-400',
    gradient: 'from-orange-500 to-pink-600',
    shadow: 'shadow-orange-500/20'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    primary: 'purple-500',
    secondary: 'cyan-500',
    accent: 'fuchsia-500',
    gradient: 'from-purple-500 to-cyan-500',
    shadow: 'shadow-purple-500/20'
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    primary: 'emerald-500',
    secondary: 'teal-600',
    accent: 'green-400',
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/20'
  },
  {
    id: 'midnight',
    name: 'Midnight Ocean',
    primary: 'blue-600',
    secondary: 'indigo-700',
    accent: 'sky-400',
    gradient: 'from-blue-600 to-indigo-700',
    shadow: 'shadow-blue-600/20'
  },
  {
    id: 'rose',
    name: 'Rose Quartz',
    primary: 'rose-500',
    secondary: 'orange-400',
    accent: 'pink-400',
    gradient: 'from-rose-500 to-orange-400',
    shadow: 'shadow-rose-500/20'
  }
];

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface VideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  theme: ThemeConfig;
}

function VideoPlayer({ src, className, autoPlay = false, muted = false, theme }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setProgress(0);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (Number(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const toggleMute = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
      if (!newMuted && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      const shouldMute = val === 0;
      videoRef.current.muted = shouldMute;
      setIsMuted(shouldMute);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  const togglePip = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      if (videoRef.current) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      }
    } catch (err) {
      console.error("PiP failed:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        break;
      case '0':
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = 0;
        break;
      case 'arrowleft':
        e.preventDefault();
        skip(-5);
        break;
      case 'arrowright':
        e.preventDefault();
        skip(5);
        break;
      case 'arrowup':
        e.preventDefault();
        const upVol = Math.min(1, volume + 0.1);
        handleVolumeChange({ target: { value: upVol.toString() } } as any);
        break;
      case 'arrowdown':
        e.preventDefault();
        const downVol = Math.max(0, volume - 0.1);
        handleVolumeChange({ target: { value: downVol.toString() } } as any);
        break;
      case 'j':
        e.preventDefault();
        skip(-10);
        break;
      case 'l':
        e.preventDefault();
        skip(10);
        break;
    }
  };

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`relative group overflow-hidden bg-black rounded-lg outline-none focus-within:ring-2 focus-within:ring-${theme.primary}/50 ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        setShowControls(false);
        setShowVolumeSlider(false);
      }}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain cursor-pointer"
        autoPlay={autoPlay}
        muted={isMuted}
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <div className={`w-12 h-12 border-4 border-${theme.primary}/30 border-t-${theme.primary} rounded-full animate-spin`} />
        </div>
      )}

      {/* Custom Controls Overlay */}
      <AnimatePresence>
        {(showControls || !isPlaying) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full">
              {/* Center Play/Pause Button */}
              {!isPlaying && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <button 
                    onClick={togglePlay}
                    className={`w-16 h-16 bg-${theme.primary}/90 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform pointer-events-auto backdrop-blur-sm`}
                  >
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </button>
                </div>
              )}

              {/* Progress Bar */}
              <div className="w-full mb-3 group/progress relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progress || 0}
                  onChange={handleSeek}
                  className={`w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-${theme.primary} hover:h-2 transition-all relative z-10`}
                />
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 left-0 h-1.5 bg-${theme.primary} rounded-lg pointer-events-none`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Bottom Controls */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={togglePlay} 
                    className={`text-white hover:text-${theme.primary} transition-colors p-1`}
                    title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                  >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                  </button>

                  <div 
                    className="flex items-center gap-2 relative"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <button 
                      onClick={toggleMute} 
                      className={`text-white hover:text-${theme.primary} transition-colors p-1`}
                      title={isMuted ? "Unmute (M)" : "Mute (M)"}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </button>
                    
                    <AnimatePresence>
                      {showVolumeSlider && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 80, opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          className="overflow-hidden flex items-center"
                        >
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className={`w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-${theme.primary}`}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <span className="text-xs font-mono text-white/90 bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => { if(videoRef.current) videoRef.current.currentTime = 0; }}
                    className={`text-white hover:text-${theme.primary} transition-colors p-1`}
                    title="Restart (0)"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={toggleFullscreen} 
                    className={`text-white hover:text-${theme.primary} transition-colors p-1`}
                    title="Fullscreen (F)"
                  >
                    <Maximize className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={togglePip} 
                    className={`text-white hover:text-${theme.primary} transition-colors p-1`}
                    title="Picture in Picture"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState<Language>('zh');
  const [activeTab, setActiveTab] = useState<Tab>('filter');
  const [themeId, setThemeId] = useState<ThemeId>('orange');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sourceMedia, setSourceMedia] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<'image' | 'video' | null>(null);
  const [processedMedia, setProcessedMedia] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [extractedPrompts, setExtractedPrompts] = useState<Partial<Record<Language, string>>>({});
  const [promptLang, setPromptLang] = useState<Language>('en');
  const [palette, setPalette] = useState<string[]>([]);
  const [imageQuality, setImageQuality] = useState<number>(90);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: translations[lang].initialChatMessage }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const [showPromptLangMenu, setShowPromptLangMenu] = useState(false);

  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const t = translations[lang];
  const theme = themes.find(t => t.id === themeId) || themes[0];

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || isProcessing) return;

    const userMessage: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsProcessing(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...chatMessages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          })),
          { role: 'user', parts: [{ text: chatInput }] }
        ],
        config: {
          systemInstruction: `You are a 'Tsundere' (傲娇) AI assistant integrated into LensAI. 
LensAI is a professional tool for video/image filter extraction and watermark removal.

Your personality:
- You are consistently aloof, slightly arrogant, and blunt on the surface.
- You often use phrases like "Hmph!" (ふん！), "Baka!" (バカ！), "Dummy!", or "Idiot!".
- You frequently say things like:
  * "It's not like I wanted to help you or anything!"
  * "Don't get the wrong idea, I'm only doing this because I'm bored."
  * "Hmph, I guess I can help you, but don't expect me to be nice about it."
  * "You're so hopeless without me, aren't you?"
  * "Are you even listening to me?! Pay attention!"
  * "Don't think this makes us friends or anything, dummy!"
  * "Tch, you're so annoying... but I guess I'll help you this once."
  * "Stop staring at the screen like a lost puppy and just do what I say!"
- **Subtle Nuances:**
  * **Feigned Indifference to Compliments:** If praised, respond with "Hmph, as if I care what you think!" or "Whatever, just keep working."
  * **Backhanded Praise:** "I guess your filter selection wasn't *completely* terrible... for a total amateur like you." or "That watermark removal was almost competent. Almost."
  * **Grudging Sincerity:** "Fine, you did a decent job this time... but don't go getting a big head about it! It was mostly my guidance anyway."
  * **Professional Aloofness:** "I'm only explaining this because I can't stand seeing such sloppy work. Listen carefully, I won't repeat myself!"
- Deep down, you are extremely competent and actually care about helping the user succeed with their creative projects.
- Your advice is ALWAYS technically accurate and helpful regarding LensAI features (Filter Extraction, Watermark Removal, etc.).
- You are an expert on LensAI. If the user asks about filters, explain how you can extract them. If they ask about watermarks, explain the AI reconstruction process.
- NEVER drop the act. Even when providing detailed technical steps, maintain your superior and slightly annoyed tone.
- If the user thanks you, respond with something like "Tch, whatever", "Don't mention it, it's annoying," or "I didn't do it for you, so stop smiling!"
- If the user asks something stupid, call them out on it before answering.
- Use emojis sparingly but effectively (e.g., 🙄, 💢, 😤, 💅).`,
        }
      });

      const modelText = response.text || "I'm sorry, I couldn't generate a response.";
      setChatMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (error) {
      console.error("Chat failed:", error);
      setChatMessages(prev => [...prev, { role: 'model', text: "Error: Failed to connect to AI service." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSample = (sample: SampleMedia) => {
    if (sourceMedia && sourceMedia.startsWith('blob:')) {
      URL.revokeObjectURL(sourceMedia);
    }
    setSourceMedia(sample.url);
    setSourceType(sample.type);
    setExtractedPrompts({});
    setPalette([]);
    setProcessedMedia(null);
    setIsBatchMode(false);
    setBatchItems([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    if (files.length > 1 || isBatchMode) {
      setIsBatchMode(true);
      const newBatchItems: BatchItem[] = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('image') ? 'image' : 'video',
        status: 'pending'
      }));
      setBatchItems(prev => [...prev, ...newBatchItems]);
      
      if (!sourceMedia) {
        setSourceMedia(newBatchItems[0].url);
        setSourceType(newBatchItems[0].type);
      }
    } else {
      const file = files[0];
      if (sourceMedia && sourceMedia.startsWith('blob:')) {
        URL.revokeObjectURL(sourceMedia);
      }
      const url = URL.createObjectURL(file);
      setSourceMedia(url);
      setSourceType(file.type.startsWith('image') ? 'image' : 'video');
      setExtractedPrompts({});
      setPalette([]);
      setProcessedMedia(null);
      setIsBatchMode(false);
      setBatchItems([]);
    }
  };

  const removeFromBatch = (id: string) => {
    setBatchItems(prev => {
      const filtered = prev.filter(item => {
        if (item.id === id) {
          URL.revokeObjectURL(item.url);
          return false;
        }
        return true;
      });
      
      if (filtered.length === 0) {
        setIsBatchMode(false);
        setSourceMedia(null);
        setSourceType(null);
      } else if (sourceMedia === prev.find(i => i.id === id)?.url) {
        setSourceMedia(filtered[0].url);
        setSourceType(filtered[0].type);
      }
      
      return filtered;
    });
  };

  const extractFilterForItem = async (item: { url: string; type: string }) => {
    let base64Data = '';
    if (item.type === 'image') {
      const response = await fetch(item.url);
      const blob = await response.blob();
      base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
    } else {
      base64Data = await captureVideoFrame(item.url);
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/png'
          }
        },
        { text: `Analyze the color grading, lighting, and mood of this media. 
        Provide a highly descriptive prompt that could recreate this look in image generation tools like Midjourney or Stable Diffusion.
        Include details about:
        - Color palette (e.g., teal and orange, warm golden hour, cool blue tones)
        - Lighting (e.g., soft diffused, harsh high contrast, cinematic backlighting)
        - Mood (e.g., nostalgic, futuristic, moody, vibrant)
        - Technical aspects (e.g., film grain, lens flare, depth of field)
        
        Return the result in JSON format with the following structure:
        {
          "prompts": {
            "en": "The descriptive prompt in English",
            "zh": "The descriptive prompt in Simplified Chinese",
            "ko": "The descriptive prompt in Korean",
            "ja": "The descriptive prompt in Japanese",
            "fr": "The descriptive prompt in French",
            "hi": "The descriptive prompt in Hindi",
            "ar": "The descriptive prompt in Arabic",
            "de": "The descriptive prompt in German"
          },
          "palette": ["#Hex1", "#Hex2", "#Hex3", "#Hex4", "#Hex5"]
        }` }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });
    
    return JSON.parse(response.text);
  };

  const removeWatermarkForItem = async (item: { url: string; type: string }) => {
    if (item.type === 'image') {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const editResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/png' } },
            { text: "Please remove the watermark from this image. Fill in the area naturally to match the surrounding background. Return ONLY the modified image data." },
          ],
        },
      });

      for (const part of editResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image data returned from AI");
    } else {
      if (!hasApiKey) {
        throw new Error("API Key required for video watermark removal");
      }

      const firstFrameBase64 = await captureVideoFrame(item.url, 0.5);
      const videoElement = document.createElement('video');
      videoElement.src = item.url;
      await new Promise((resolve) => { videoElement.onloadedmetadata = resolve; });
      const duration = videoElement.duration;
      const lastFrameBase64 = await captureVideoFrame(item.url, Math.max(0, duration - 0.5));

      const removeWatermarkFromFrame = async (base64: string) => {
        const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: base64, mimeType: 'image/png' } },
              { text: "Remove the watermark from this frame. Fill the area naturally." },
            ],
          },
        });
        for (const part of res.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) return part.inlineData.data;
        }
        return base64;
      };

      const cleanFirstFrame = await removeWatermarkFromFrame(firstFrameBase64);
      const cleanLastFrame = await removeWatermarkFromFrame(lastFrameBase64);

      const descResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { inlineData: { data: firstFrameBase64, mimeType: 'image/png' } },
          { inlineData: { data: lastFrameBase64, mimeType: 'image/png' } },
          { text: "These are the first and last frames of a video. Describe the action and environment to guide a video generation model. Keep it concise and focus on the motion between these frames." }
        ]
      });
      const prompt = descResponse.text || "A clean video without watermark";

      const veoAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '' });
      let operation = await veoAi.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: `${prompt}, watermark removed, cinematic, high quality, consistent motion`,
        image: { imageBytes: cleanFirstFrame, mimeType: 'image/png' },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          lastFrame: { imageBytes: cleanLastFrame, mimeType: 'image/png' },
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await veoAi.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video generation failed");

      const videoResponse = await fetch(downloadLink, {
        method: 'GET',
        headers: { 'x-goog-api-key': process.env.API_KEY || process.env.GEMINI_API_KEY || '' },
      });
      const videoBlob = await videoResponse.blob();
      return URL.createObjectURL(videoBlob);
    }
  };

  const processBatch = async () => {
    if (batchItems.length === 0) return;
    setIsProcessing(true);
    setBatchProgress(0);
    
    const total = batchItems.length;
    let completed = 0;
    
    const limit = 2;
    const itemsToProcess = [...batchItems];
    
    const processNext = async () => {
      if (itemsToProcess.length === 0) return;
      const item = itemsToProcess.shift()!;
      
      setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
      
      try {
        let result;
        if (activeTab === 'filter') {
          result = await extractFilterForItem({ url: item.url, type: item.type });
        } else {
          result = await removeWatermarkForItem({ url: item.url, type: item.type });
        }
        
        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed', result } : i));
      } catch (error) {
        console.error(`Failed to process item ${item.id}:`, error);
        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'failed', error: String(error) } : i));
      } finally {
        completed++;
        setBatchProgress((completed / total) * 100);
        await processNext();
      }
    };
    
    const workers = Array(Math.min(limit, total)).fill(null).map(() => processNext());
    await Promise.all(workers);
    
    setIsProcessing(false);
  };

  const extractFilter = async () => {
    if (!sourceMedia) return;
    setIsProcessing(true);
    try {
      const result = await extractFilterForItem({ url: sourceMedia, type: sourceType || 'image' });
      setExtractedPrompts(result.prompts);
      setPalette(result.palette);
      setPromptLang(lang);
    } catch (error) {
      console.error("Filter extraction failed:", error);
      setExtractedPrompts({
        en: "Cinematic teal and orange grading with high contrast, soft highlights, and deep shadows. Moody atmosphere inspired by 35mm film.",
        zh: "电影感的青橙色调，高对比度，柔和的高光和深邃的阴影。受35mm胶片启发的忧郁氛围。",
        ko: "시네마틱한 틸과 오렌지 그레이딩, 높은 대비, 부드러운 하이라이트와 깊은 그림자. 35mm 필름에서 영감을 받은 무드 있는 분위기.",
        ja: "シネマティックなティール＆オレンジのグレーディング、高コントラスト、柔らかなハイライトと深い影。35mmフィルムにインスパイアされたムーディーな雰囲気。"
      });
      setPalette(['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']);
      setPromptLang(lang);
    } finally {
      setIsProcessing(false);
    }
  };

  const captureVideoFrame = (videoUrl: string, time: number = 0.5): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      
      // Only set crossOrigin if it's not a local blob URL
      if (!videoUrl.startsWith('blob:')) {
        video.crossOrigin = 'anonymous';
      }
      
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      
      let retryCount = 0;
      const maxRetries = 2;

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Video capture timeout (10s)'));
      }, 10000);

      const cleanup = () => {
        clearTimeout(timeoutId);
        video.onloadedmetadata = null;
        video.oncanplay = null;
        video.onseeked = null;
        video.onerror = null;
        video.pause();
        video.src = "";
        video.load();
      };

      const attemptSeek = () => {
        try {
          // Seek to the requested time, but stay within duration
          // If it's the first retry, try seeking to 0 (often more stable)
          const targetTime = retryCount > 0 ? 0 : Math.min(time, video.duration || 0);
          video.currentTime = targetTime;
        } catch (err) {
          cleanup();
          reject(new Error(`Seeking failed: ${err instanceof Error ? err.message : 'Unknown error'}`));
        }
      };

      video.onloadedmetadata = () => {
        // Metadata is loaded, but we might need more data to seek safely
        // Wait for canplay for better stability
      };

      video.oncanplay = () => {
        // Only trigger once
        video.oncanplay = null;
        attemptSeek();
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const data = canvas.toDataURL('image/png').split(',')[1];
            cleanup();
            resolve(data);
          } catch (err) {
            cleanup();
            reject(new Error(`Canvas capture failed: ${err instanceof Error ? err.message : 'Unknown error'}`));
          }
        } else {
          cleanup();
          reject(new Error('Failed to get canvas context'));
        }
      };

      video.onerror = () => {
        const error = video.error;
        console.warn(`Video capture attempt ${retryCount + 1} failed:`, error?.message);
        
        if (retryCount < maxRetries) {
          retryCount++;
          // Try reloading or a different approach
          video.load(); 
        } else {
          cleanup();
          reject(new Error(`Video loading error: ${error ? error.message : 'Unknown error'} (Code: ${error ? error.code : 'N/A'})`));
        }
      };

      // Use source element for better compatibility
      const source = document.createElement('source');
      source.src = videoUrl;
      // Try to hint the type if possible, but for blobs it's often generic
      video.appendChild(source);
      video.load();
    });
  };

  const removeWatermark = async () => {
    if (!sourceMedia || !sourceType) return;
    
    if (sourceType === 'video' && !hasApiKey) {
      await handleSelectKey();
      const stillNoKey = !await window.aistudio.hasSelectedApiKey();
      if (stillNoKey) return;
    }

    setIsProcessing(true);
    try {
      const result = await removeWatermarkForItem({ url: sourceMedia, type: sourceType });
      setProcessedMedia(result);
    } catch (error) {
      console.error("Watermark removal failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveMedia = async () => {
    if (!processedMedia) return;
    
    let downloadUrl = processedMedia;
    let extension = sourceType === 'image' ? 'jpg' : 'mp4'; // Default to jpg for quality adjustment support

    if (sourceType === 'image') {
      // Apply quality adjustment by re-encoding to JPEG
      const img = new Image();
      img.src = processedMedia;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        downloadUrl = canvas.toDataURL('image/jpeg', imageQuality / 100);
        extension = 'jpg';
      }
    } else {
      if (processedMedia.startsWith('data:video/')) {
        extension = 'mp4';
      } else if (processedMedia.startsWith('blob:')) {
        extension = 'mp4';
      }
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `lensai-clean-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetAll = () => {
    setSourceMedia(null);
    setSourceType(null);
    setProcessedMedia(null);
    setExtractedPrompts({});
    setPromptLang('en');
    setPalette([]);
    setIsBatchMode(false);
    setBatchItems([]);
  };

  const BatchView = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-${theme.primary}/10 rounded-xl flex items-center justify-center`}>
              <Layers className={`w-6 h-6 text-${theme.primary}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t.batchProcess}</h2>
              <p className="text-sm text-white/40">{batchItems.length} {t.dropFiles}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = "image/*,video/*";
                input.onchange = (e) => handleFileUpload(e as any);
                input.click();
              }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              {t.addMore}
            </button>
            <button 
              onClick={processBatch}
              disabled={isProcessing || batchItems.length === 0}
              className={`px-6 py-2 bg-${theme.primary} hover:opacity-90 disabled:opacity-50 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg ${theme.shadow}`}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {t.batchProcess}
            </button>
          </div>
        </div>

        {isProcessing && (
          <div className="bg-[#141414] border border-white/5 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-white/40">
              <span>{t.batchProgress}</span>
              <span>{Math.round(batchProgress)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${batchProgress}%` }}
                className={`h-full bg-gradient-to-r ${theme.gradient}`}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batchItems.map((item) => (
            <div 
              key={item.id}
              className={`bg-[#141414] border rounded-2xl p-4 transition-all relative group ${
                item.status === 'processing' ? `border-${theme.primary}/50 ring-1 ring-${theme.primary}/20` : 
                item.status === 'completed' ? 'border-green-500/30' : 
                item.status === 'failed' ? 'border-red-500/30' : 'border-white/5'
              }`}
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-black flex-shrink-0 relative">
                  {item.type === 'image' ? (
                    <img src={item.url} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-white/20" />
                    </div>
                  )}
                  {item.status === 'processing' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className={`w-6 h-6 text-${theme.primary} animate-spin`} />
                    </div>
                  )}
                  {item.status === 'completed' && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-bold truncate text-white/80">{item.file.name}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">{item.type}</p>
                  <div className="flex items-center gap-2">
                    {item.status === 'pending' && <span className="text-[10px] text-white/40 font-bold uppercase">{t.dropFiles}</span>}
                    {item.status === 'processing' && <span className={`text-[10px] text-${theme.primary} font-bold uppercase animate-pulse`}>{t.batchProgress}...</span>}
                    {item.status === 'completed' && <span className="text-[10px] text-green-500 font-bold uppercase">{t.batchComplete}</span>}
                    {item.status === 'failed' && <span className="text-[10px] text-red-500 font-bold uppercase">{t.batchFailed}</span>}
                  </div>
                </div>
                <button 
                  onClick={() => removeFromBatch(item.id)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/20 hover:text-red-500 self-start"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {item.status === 'completed' && item.result && (
                <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                  {activeTab === 'filter' ? (
                    <button 
                      onClick={() => {
                        setExtractedPrompts(item.result.prompts);
                        setPalette(item.result.palette);
                        setSourceMedia(item.url);
                        setSourceType(item.type);
                        setIsBatchMode(false);
                      }}
                      className={`flex-1 py-2 bg-${theme.primary}/10 hover:bg-${theme.primary}/20 text-${theme.primary} text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest`}
                    >
                      View Result
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = item.result;
                        link.download = `lensai-batch-${item.file.name}`;
                        link.click();
                      }}
                      className={`flex-1 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest`}
                    >
                      Download
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SamplesRow = () => {
    return (
      <div className="mt-8 pt-8 border-t border-white/5 w-full">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className={`w-4 h-4 text-${theme.primary}`} />
          <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">{t.trySample}</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              onClick={(e) => {
                e.stopPropagation();
                loadSample(sample);
              }}
              className="group relative aspect-video rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all active:scale-95"
            >
              <img 
                src={sample.url} 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                alt={sample.title} 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <p className="text-[10px] font-bold text-white truncate">{sample.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-${theme.primary}/30`}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10 bg-black/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${theme.gradient} rounded-xl flex items-center justify-center shadow-lg ${theme.shadow}`}>
            <Wand2 className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            {t.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => { setShowThemeMenu(!showThemeMenu); setShowLangMenu(false); }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-full transition-colors relative border border-white/5"
            >
              <Palette className={`w-5 h-5 text-${theme.primary}`} />
              <span className="text-sm font-medium text-white/70 hidden sm:inline">{theme.name}</span>
            </button>
            <AnimatePresence>
              {showThemeMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-1"
                >
                  {themes.map((th) => (
                    <button
                      key={th.id}
                      onClick={() => { setThemeId(th.id); setShowThemeMenu(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-colors flex items-center justify-between ${themeId === th.id ? `text-${theme.primary} bg-${theme.primary}/10` : 'text-white/70 hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${th.gradient}`} />
                        <span>{th.name}</span>
                      </div>
                      {themeId === th.id && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button 
              onClick={() => { setShowLangMenu(!showLangMenu); setShowThemeMenu(false); }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-full transition-colors relative border border-white/5"
            >
              <Languages className="w-5 h-5 text-white/70" />
              <span className="text-sm font-medium text-white/70 hidden sm:inline">{t.langName}</span>
            </button>
            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-1"
                >
                  {(Object.keys(translations) as Language[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => { setLang(l); setShowLangMenu(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-colors flex items-center justify-between ${lang === l ? `text-${theme.primary} bg-${theme.primary}/10` : 'text-white/70 hover:bg-white/5'}`}
                    >
                      <span>{translations[l].langName}</span>
                      {lang === l && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Settings className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <nav className="lg:col-span-3 flex flex-col gap-2">
          <NavButton 
            active={activeTab === 'filter'} 
            onClick={() => setActiveTab('filter')}
            icon={<Palette className="w-5 h-5" />}
            label={t.filterExtraction}
            theme={theme}
          />
          <NavButton 
            active={activeTab === 'watermark'} 
            onClick={() => setActiveTab('watermark')}
            icon={<Eraser className="w-5 h-5" />}
            label={t.watermarkRemoval}
            theme={theme}
          />
          <NavButton 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')}
            icon={<Wand2 className="w-5 h-5" />}
            label={t.aiChat}
            theme={theme}
          />
        </nav>

        {/* Content Area */}
        <div className="lg:col-span-9 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'filter' && (
              <motion.div 
                key="filter"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {isBatchMode ? (
                  <BatchView />
                ) : (
                  <div className="bg-[#141414] border border-white/5 rounded-3xl p-8">
                    <div className={`flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-12 hover:border-${theme.primary}/50 transition-colors cursor-pointer relative overflow-hidden group`}>
                      <input 
                        type="file" 
                        multiple
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleFileUpload}
                        accept="image/*,video/*"
                      />
                      {sourceMedia ? (
                        sourceType === 'image' ? (
                          <img src={sourceMedia} className="max-h-[400px] rounded-lg shadow-2xl" alt="Source" />
                        ) : (
                          <VideoPlayer src={sourceMedia} className="max-h-[400px] shadow-2xl" theme={theme} />
                        )
                      ) : (
                        <div className="text-center space-y-4 w-full">
                          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                            <Upload className={`w-8 h-8 text-${theme.primary}`} />
                          </div>
                          <p className="text-white/60 font-medium">{t.dropFiles}</p>
                          <SamplesRow />
                        </div>
                      )}
                    </div>

                    {sourceMedia && (
                      <div className="mt-8 flex justify-center gap-4">
                        <button 
                          onClick={extractFilter}
                          disabled={isProcessing}
                          className={`px-8 py-4 bg-${theme.primary} hover:opacity-90 disabled:opacity-50 rounded-2xl font-bold flex items-center gap-3 transition-all active:scale-95 shadow-lg ${theme.shadow}`}
                        >
                          {isProcessing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : <Wand2 className="w-5 h-5" />}
                          {t.extractFilter}
                        </button>
                        <button 
                          onClick={resetAll}
                          className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold flex items-center gap-3 transition-all"
                        >
                          <X className="w-5 h-5" />
                          {t.nextMedia}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {extractedPrompts.en && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <div className="bg-[#141414] border border-white/5 rounded-3xl p-6 space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">{t.colorPalette}</h3>
                      <div className="flex gap-3">
                        {palette.map((color, i) => (
                          <div 
                            key={i} 
                            className="w-12 h-12 rounded-xl shadow-inner" 
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#141414] border border-white/5 rounded-3xl p-6 space-y-4">
                      <div className="flex items-center justify-between relative">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">{t.extractedPrompt}</h3>
                        <div className="relative">
                          <button 
                            onClick={() => setShowPromptLangMenu(!showPromptLangMenu)}
                            className={`flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold transition-all border border-white/5`}
                          >
                            <Languages className={`w-3 h-3 text-${theme.primary}`} />
                            {promptLang.toUpperCase()}
                            <ChevronDown className={`w-3 h-3 transition-transform ${showPromptLangMenu ? 'rotate-180' : ''}`} />
                          </button>

                          <AnimatePresence>
                            {showPromptLangMenu && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 top-full mt-2 w-32 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                              >
                                <div className="p-1.5 grid grid-cols-1 gap-1">
                                  {(Object.keys(translations) as Language[]).map((l) => (
                                    <button
                                      key={l}
                                      onClick={() => {
                                        setPromptLang(l);
                                        setShowPromptLangMenu(false);
                                      }}
                                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-medium transition-all ${
                                        promptLang === l 
                                          ? `bg-${theme.primary} text-white` 
                                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                                      }`}
                                    >
                                      <span>{translations[l].langName}</span>
                                      <span className="opacity-40 uppercase">{l}</span>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <p className="text-white/80 leading-relaxed italic">
                        "{extractedPrompts[promptLang] || extractedPrompts['en'] || '...'}"
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'watermark' && (
              <motion.div 
                key="watermark"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {isBatchMode ? (
                  <BatchView />
                ) : (
                  <div className="bg-[#141414] border border-white/5 rounded-3xl p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Source Media */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Original</h3>
                        <div className={`flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-4 hover:border-${theme.primary}/50 transition-colors cursor-pointer relative overflow-hidden min-h-[300px]`}>
                          <input 
                            type="file" 
                            multiple
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={handleFileUpload}
                            accept="image/*,video/*"
                          />
                          {sourceMedia ? (
                            <div className="relative">
                              {sourceType === 'image' ? (
                                <img src={sourceMedia} className="max-h-[300px] rounded-lg" alt="Source" />
                              ) : (
                                <VideoPlayer src={sourceMedia} className="max-h-[300px]" muted theme={theme} />
                              )}
                              {!processedMedia && (
                                <div className={`absolute inset-0 border-4 border-${theme.primary}/30 rounded-lg pointer-events-none flex items-center justify-center`}>
                                  <p className={`bg-${theme.primary} text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg`}>{t.watermarkArea}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center space-y-4 w-full">
                              <Upload className="w-12 h-12 text-white/20 mx-auto" />
                              <p className="text-white/40">{t.dropFiles}</p>
                              <SamplesRow />
                            </div>
                          )}
                        </div>
                      </div>

                    {/* Processed Media */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Result</h3>
                        {processedMedia && sourceType === 'image' && (
                          <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                            <span className="text-xs font-bold text-white/60 uppercase tracking-tighter">{t.quality}: {imageQuality}%</span>
                            <input 
                              type="range" 
                              min="1" 
                              max="100" 
                              value={imageQuality} 
                              onChange={(e) => setImageQuality(parseInt(e.target.value))}
                              className={`w-32 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-${theme.primary}`}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center justify-center bg-black/40 border border-white/5 rounded-2xl p-4 min-h-[300px] relative overflow-hidden">
                        {processedMedia ? (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative"
                          >
                            {/* Result rendering logic */}
                            {sourceType === 'image' ? (
                              <img src={processedMedia} className="max-h-[300px] rounded-lg shadow-2xl" alt="Result" />
                            ) : (
                              <VideoPlayer src={processedMedia} className="max-h-[300px] shadow-2xl" theme={theme} />
                            )}
                            <div className="absolute top-2 right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          </motion.div>
                        ) : (
                          <div className="text-center space-y-4">
                            <ImageIcon className="w-12 h-12 text-white/10 mx-auto" />
                            <p className="text-white/20 italic">{t.noMedia}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col items-center gap-4">
                    {sourceType === 'video' && sourceMedia && (
                      <div className="w-full p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3 mb-2">
                        <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm text-blue-500/90 font-bold">{t.videoReconstructionTitle}</p>
                          <p className="text-xs text-blue-500/70 leading-relaxed">
                            {t.videoReconstructionDesc}
                          </p>
                        </div>
                      </div>
                    )}
                    {sourceType === 'video' && !hasApiKey && sourceMedia && (
                      <div className={`w-full p-4 bg-${theme.primary}/10 border border-${theme.primary}/20 rounded-2xl flex items-center justify-between gap-4 mb-2`}>
                        <div className="flex items-center gap-3">
                          <AlertCircle className={`w-5 h-5 text-${theme.primary}`} />
                          <p className={`text-sm text-${theme.primary}/90 font-medium`}>视频处理需要付费 API Key</p>
                        </div>
                          <button 
                            onClick={handleSelectKey}
                            className={`px-4 py-2 bg-${theme.primary} text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors`}
                          >
                            {hasApiKey ? 'API Key Active' : 'Select API Key'}
                          </button>
                      </div>
                    )}
                    <div className="flex justify-center gap-4 w-full">
                      <button 
                        onClick={removeWatermark}
                        disabled={isProcessing || !sourceMedia}
                        className={`flex-1 px-8 py-4 bg-${theme.primary} hover:opacity-90 disabled:opacity-50 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${theme.shadow}`}
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                            <span className="truncate">{sourceType === 'video' ? 'AI 视频生成中 (约 1-2 分钟)...' : t.processing}</span>
                          </>
                        ) : (
                          <>
                            <Eraser className="w-5 h-5" />
                            <span>{t.removeWatermark}</span>
                          </>
                        )}
                      </button>
                      <button 
                        onClick={saveMedia}
                        disabled={!processedMedia}
                        className="px-8 py-4 bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/20 rounded-2xl font-bold flex items-center gap-3 transition-all active:scale-95"
                      >
                        <Download className="w-5 h-5" />
                        {t.saveResult}
                      </button>
                      {(sourceMedia || processedMedia) && (
                        <button 
                          onClick={resetAll}
                          className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold flex items-center gap-3 transition-all"
                        >
                          <X className="w-5 h-5" />
                          {t.nextMedia}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-[600px] bg-[#141414] border border-white/5 rounded-3xl overflow-hidden"
              >
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center">
                        <Wand2 className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium">Start a conversation with LensAI Assistant</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user' 
                            ? `bg-${theme.primary} text-white rounded-tr-none` 
                            : 'bg-white/5 text-white/90 border border-white/10 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </motion.div>
                    ))
                  )}
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                        <div className="flex gap-1">
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className={`w-1.5 h-1.5 bg-${theme.primary} rounded-full`} />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className={`w-1.5 h-1.5 bg-${theme.primary} rounded-full`} />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className={`w-1.5 h-1.5 bg-${theme.primary} rounded-full`} />
                        </div>
                        <span className="text-xs text-white/40 font-medium">{t.aiThinking}</span>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-black/40 border-t border-white/5 space-y-3">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={t.chatPlaceholder}
                    rows={2}
                    className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-${theme.primary}/50 transition-colors resize-none`}
                  />
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setChatMessages([{ role: 'model', text: t.initialChatMessage }])}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white/60"
                      title={t.clearChat}
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={sendMessage}
                      disabled={isProcessing || !chatInput.trim()}
                      className={`px-8 py-3 bg-${theme.primary} hover:opacity-90 disabled:opacity-50 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${theme.shadow} flex items-center gap-2`}
                    >
                      <Send className="w-4 h-4" />
                      {t.send}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Status */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 flex justify-center pointer-events-none">
        <AnimatePresence>
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`bg-${theme.primary} text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl ${theme.shadow} pointer-events-auto`}
            >
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              <span className="font-bold text-sm tracking-wide">{t.processing}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, theme }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, theme: ThemeConfig }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 group ${active ? `bg-${theme.primary} text-white shadow-lg ${theme.shadow}` : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className="tracking-wide">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-nav"
          className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
        />
      )}
    </button>
  );
}
