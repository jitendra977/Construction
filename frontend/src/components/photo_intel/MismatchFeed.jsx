import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { photoIntelService, getMediaUrl } from '../../services/api';

/**
 * Homeowner-facing feed of high-confidence phase mismatches.
 * Use on the desktop dashboard as a red-flag panel.
 */
const MismatchFeed = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await photoIntelService.getMismatches();
            setItems(Array.isArray(data) ? data : data.results || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="bg-white rounded-xl border border-amber-200 p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold inline-flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-4 h-4" /> AI Mismatch Feed
                    <span className="ml-1 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        {items.length}
                    </span>
                </h3>
                <button onClick={load} className="text-xs inline-flex items-center gap-1 text-gray-500 hover:text-gray-700">
                    <RefreshCw className="w-3 h-3" /> Refresh
                </button>
            </div>

            {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
            ) : items.length === 0 ? (
                <div className="text-sm text-gray-500">No mismatches flagged — AI agrees with all task-phase assignments. ✅</div>
            ) : (
                <ul className="divide-y">
                    {items.slice(0, 8).map((a) => (
                        <li key={a.id} className="py-2 flex items-center gap-3">
                            {a.media_url && (
                                <img
                                    src={getMediaUrl(a.media_url)}
                                    alt=""
                                    className="w-12 h-12 object-cover rounded"
                                />
                            )}
                            <div className="flex-1 min-w-0 text-sm">
                                <div className="font-medium truncate">{a.task_title || 'Task'}</div>
                                <div className="text-xs text-gray-500">
                                    Task phase: <strong>{a.task_phase_name || '—'}</strong> · AI saw:{' '}
                                    <strong className="text-amber-700">{a.detected_phase_label}</strong>{' '}
                                    ({Math.round(a.phase_confidence * 100)}%)
                                </div>
                            </div>
                            <a href={`/tasks/${a.media?.task || a.media}`} className="text-gray-400 hover:text-gray-600">
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MismatchFeed;
