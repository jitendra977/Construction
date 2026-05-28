import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2 } from 'lucide-react';

const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function CustomVideoPlayer({ src, className = '' }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isHovering, setIsHovering] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    
    const hideTimeout = useRef(null);

    const handleMouseMove = () => {
        setIsHovering(true);
        clearTimeout(hideTimeout.current);
        if (isPlaying) {
            hideTimeout.current = setTimeout(() => setIsHovering(false), 2500);
        }
    };

    const handleMouseLeave = () => {
        if (isPlaying) setIsHovering(false);
    };

    const togglePlay = (e) => {
        if (e) e.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
        }
    };

    const handleLoadedData = () => {
        setIsLoading(false);
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const toggleMute = (e) => {
        if (e) e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleFullscreen = (e) => {
        if (e) e.stopPropagation();
        if (!containerRef.current) return;
        
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const handleTimelineClick = (e) => {
        e.stopPropagation();
        const timeline = e.currentTarget;
        const rect = timeline.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        
        if (videoRef.current) {
            videoRef.current.currentTime = percentage * videoRef.current.duration;
            setProgress(percentage * 100);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Also toggle play when clicking on the video itself
    const handleVideoClick = (e) => {
        e.stopPropagation();
        togglePlay();
    };

    return (
        <div 
            ref={containerRef}
            className={`relative group bg-black rounded-2xl overflow-hidden flex items-center justify-center ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
            )}
            
            <video
                ref={videoRef}
                src={src}
                className="w-full h-full max-h-[72vh] object-contain cursor-pointer"
                onTimeUpdate={handleTimeUpdate}
                onLoadedData={handleLoadedData}
                onClick={handleVideoClick}
                onEnded={() => setIsPlaying(false)}
                playsInline
            />

            {/* Play/Pause center overlay (shows when paused) */}
            {!isPlaying && !isLoading && (
                <div 
                    className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none transition-opacity duration-300"
                    style={{ opacity: isHovering || !isPlaying ? 1 : 0 }}
                >
                    <div className="w-16 h-16 rounded-full bg-[var(--t-primary)]/90 text-white flex items-center justify-center backdrop-blur-md shadow-2xl scale-100 hover:scale-110 transition-transform pointer-events-auto cursor-pointer" onClick={togglePlay}>
                        <Play className="w-8 h-8 ml-1" />
                    </div>
                </div>
            )}

            {/* Bottom Controls Bar */}
            <div 
                className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pb-4 px-4 transition-opacity duration-300"
                style={{ opacity: isHovering || !isPlaying ? 1 : 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Timeline */}
                <div 
                    className="w-full h-2 mb-4 bg-white/20 rounded-full cursor-pointer relative group/timeline overflow-hidden"
                    onClick={handleTimelineClick}
                >
                    <div 
                        className="absolute top-0 left-0 h-full bg-[var(--t-primary)] rounded-full group-hover/timeline:bg-indigo-400 transition-colors"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                
                {/* Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            type="button"
                            onClick={togglePlay} 
                            className="text-white hover:text-[var(--t-primary)] transition-colors focus:outline-none"
                        >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </button>
                        
                        <div className="text-white text-xs font-medium font-mono">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                        
                        <button 
                            type="button"
                            onClick={toggleMute} 
                            className="text-white hover:text-[var(--t-primary)] transition-colors focus:outline-none ml-2"
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    </div>
                    
                    <button 
                        type="button"
                        onClick={toggleFullscreen} 
                        className="text-white hover:text-[var(--t-primary)] transition-colors focus:outline-none"
                    >
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
