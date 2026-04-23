import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, Loader2, CircleDashed } from 'lucide-react';

/**
 * Compact badge overlaid on a task photo showing the AI-detected phase,
 * confidence bar, and match/mismatch verdict.
 *
 * Props:
 *   analysis  { status, detected_phase_label, phase_confidence, phase_match,
 *               tags, quality_score }
 *   compact   boolean — tight variant for thumbnails
 */
const PhotoAIBadge = ({ analysis, compact = false }) => {
    if (!analysis) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <CircleDashed className="w-3 h-3" /> AI: —
            </span>
        );
    }

    const { status, detected_phase_label, phase_confidence, phase_match, tags = [], quality_score } = analysis;

    if (status === 'PENDING' || status === 'PROCESSING') {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Analyzing…
            </span>
        );
    }
    if (status === 'FAILED') {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-red-500">
                <AlertTriangle className="w-3 h-3" /> AI failed
            </span>
        );
    }
    if (status === 'SKIPPED') {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <CircleDashed className="w-3 h-3" /> Not an image
            </span>
        );
    }

    const confidence = Math.round((phase_confidence || 0) * 100);
    const matchColor =
        phase_match === 'MATCH' ? 'bg-green-100 text-green-700 border-green-300' :
        phase_match === 'MISMATCH' ? 'bg-red-100 text-red-700 border-red-300' :
        'bg-gray-100 text-gray-600 border-gray-300';

    const Icon =
        phase_match === 'MATCH' ? CheckCircle2 :
        phase_match === 'MISMATCH' ? AlertTriangle : Sparkles;

    if (compact) {
        return (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${matchColor}`}>
                <Icon className="w-3 h-3" />
                {detected_phase_label || '—'} · {confidence}%
            </span>
        );
    }

    return (
        <div className={`flex flex-col gap-1 p-2 rounded-lg border ${matchColor}`}>
            <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 font-medium text-sm">
                    <Icon className="w-4 h-4" />
                    {detected_phase_label || 'Unknown'}
                </span>
                <span className="text-xs font-mono opacity-75">{confidence}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-white/50 overflow-hidden">
                <div
                    className="h-full bg-current transition-all"
                    style={{ width: `${confidence}%`, opacity: 0.6 }}
                />
            </div>
            {tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                    {tags.slice(0, 4).map((t, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-white/70 rounded text-[10px]">
                            {t}
                        </span>
                    ))}
                </div>
            )}
            {typeof quality_score === 'number' && (
                <div className="text-[10px] opacity-75 mt-1">
                    Photo quality: {Math.round(quality_score * 100)}%
                </div>
            )}
        </div>
    );
};

export default PhotoAIBadge;
