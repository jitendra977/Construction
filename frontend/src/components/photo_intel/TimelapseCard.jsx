import React, { useState } from 'react';
import { Play, RefreshCw, Download, Film, Clock } from 'lucide-react';
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
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
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
                                className="w-full h-full object-cover opacity-80"
                            />
                        ) : (
                            <Film className="w-12 h-12 text-gray-600" />
                        )}
                        {hasOutput && (
                            <button
                                onClick={() => setIsPlaying(true)}
                                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition"
                            >
                                <Play className="w-12 h-12 text-white drop-shadow" />
                            </button>
                        )}
                        {!hasOutput && (
                            <div className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">
                                {timelapse.status === 'GENERATING' ? 'Generating…' : timelapse.status}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{timelapse.title}</div>
                        <div className="text-xs text-gray-500 truncate">
                            {scopeLabel[timelapse.scope]} · {scopeName}
                        </div>
                    </div>
                    <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                        {timelapse.media_count} frames
                    </span>
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timelapse.duration_seconds}s
                    </span>
                    <span>
                        {timelapse.period_start} → {timelapse.period_end}
                    </span>
                </div>

                <div className="flex gap-1 mt-2">
                    <button
                        onClick={handleRegenerate}
                        disabled={busy}
                        className="flex-1 inline-flex items-center justify-center gap-1 text-xs py-1.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
                    >
                        <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} /> Regenerate
                    </button>
                    {src && (
                        <a
                            href={src}
                            download
                            className="flex-1 inline-flex items-center justify-center gap-1 text-xs py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                            <Download className="w-3 h-3" /> Download
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimelapseCard;
