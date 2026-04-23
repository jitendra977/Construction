import React, { useState } from 'react';
import { Play, RefreshCw, Download, Film, Clock, Trash2 } from 'lucide-react';
import { photoIntelService } from '../../services/api';

const scopeLabel = {
    ROOM: 'Room',
    FLOOR: 'Floor',
    PHASE: 'Phase',
    PROJECT: 'Project',
};

const TimelapseCard = ({ timelapse, onChange }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [busy, setBusy] = useState(false);

    const src = timelapse.video_url || timelapse.gif_url;
    const hasOutput = !!src;
    const isGenerating = timelapse.status === 'GENERATING';

    const handleRegenerate = async () => {
        setBusy(true);
        try {
            await photoIntelService.regenerateTimelapse(timelapse.id);
            onChange?.();
        } finally {
            setBusy(false);
        }
    };

    const scopeName =
        timelapse.room_name || timelapse.floor_name || timelapse.phase_name ||
        (timelapse.scope === 'PROJECT' ? 'Whole Project' : '');

    return (
        <div className="group relative rounded-3xl border border-[var(--t-border)] bg-[var(--t-surface)] shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            {/* ── Cinematic Preview ── */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                {hasOutput && isPlaying ? (
                    timelapse.video_url ? (
                        <video
                            src={src}
                            controls
                            autoPlay
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <img src={src} alt={timelapse.title} className="w-full h-full object-contain" />
                    )
                ) : (
                    <>
                        {timelapse.thumbnail_url ? (
                            <img
                                src={timelapse.thumbnail_url}
                                alt={timelapse.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-90"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-3 opacity-20">
                                <Film className="w-12 h-12 text-white" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">No Preview</span>
                            </div>
                        )}
                        
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                        {hasOutput && !isGenerating && (
                            <button
                                onClick={() => setIsPlaying(true)}
                                className="absolute inset-0 flex items-center justify-center group/play"
                            >
                                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 transition-all duration-300 group-hover/play:scale-110 group-hover/play:bg-blue-600 group-hover/play:border-blue-500 shadow-2xl">
                                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                                </div>
                            </button>
                        )}

                        {isGenerating && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                                    <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 animate-pulse">Processing Site Data...</span>
                            </div>
                        )}

                        {/* Status Badge */}
                        <div className="absolute top-4 right-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest backdrop-blur-md border ${
                                hasOutput ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                            }`}>
                                {timelapse.status}
                            </span>
                        </div>

                        {/* Duration Overlay */}
                        {timelapse.duration_seconds > 0 && (
                            <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/60 backdrop-blur text-[10px] font-bold text-white font-mono">
                                {timelapse.duration_seconds}s
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Details ── */}
            <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                        <h3 className="font-black text-sm text-[var(--t-text)] truncate group-hover:text-blue-600 transition-colors">
                            {timelapse.title || 'Untitled Sequence'}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {scopeLabel[timelapse.scope]}
                            </span>
                            <span className="text-[10px] font-bold text-[var(--t-text3)] truncate">
                                {scopeName}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold text-[var(--t-text3)] border-t border-[var(--t-border)] pt-4">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{timelapse.period_start} — {timelapse.period_end}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5" />
                        <span>{timelapse.media_count} Frames</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleRegenerate}
                        disabled={busy || isGenerating}
                        className="flex-1 inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl bg-[var(--t-surface2)] text-[var(--t-text)] hover:bg-[var(--t-border)] transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} /> 
                        Refresh
                    </button>
                    {src && (
                        <a
                            href={src}
                            download
                            className="flex-1 inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                        >
                            <Download className="w-3.5 h-3.5" /> 
                            Get Video
                        </a>
                    )}
                    <button
                        onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this sequence?')) {
                                setBusy(true);
                                try {
                                    await photoIntelService.deleteTimelapse(timelapse.id);
                                    onChange?.();
                                } finally {
                                    setBusy(false);
                                }
                            }
                        }}
                        disabled={busy}
                        className="w-11 inline-flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50"
                        title="Delete Sequence"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TimelapseCard;
