import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Prominent banner shown when an uploaded photo's AI-detected phase does not
 * match the Task's assigned ConstructionPhase (above confidence threshold).
 * Used on task-detail pages to prompt the uploader to correct or confirm.
 */
const PhaseMatchWarning = ({ analysis, taskPhaseName, onDismiss, onReanalyze }) => {
    if (!analysis || analysis.phase_match !== 'MISMATCH' || analysis.phase_confidence < 0.6) {
        return null;
    }
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
                <div className="font-semibold">Phase mismatch detected</div>
                <p className="mt-0.5">
                    Task is <strong>{taskPhaseName || 'unset'}</strong>, but this photo looks like{' '}
                    <strong>{analysis.detected_phase_label}</strong>{' '}
                    ({Math.round(analysis.phase_confidence * 100)}% confident).
                </p>
                <p className="text-xs opacity-75 mt-1">
                    के यो photo गलत task मा upload भएको हो? कि AI गलत हो?
                </p>
                <div className="flex gap-2 mt-2">
                    {onReanalyze && (
                        <button
                            onClick={onReanalyze}
                            className="px-2 py-1 text-xs rounded bg-amber-600 text-white hover:bg-amber-700"
                        >
                            Re-analyze
                        </button>
                    )}
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="px-2 py-1 text-xs rounded bg-white text-amber-800 border border-amber-300 hover:bg-amber-100"
                        >
                            Ignore
                        </button>
                    )}
                </div>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="p-1">
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default PhaseMatchWarning;
