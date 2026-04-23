import React, { useEffect, useMemo, useState } from 'react';
import { Film, Plus, Filter, Loader2 } from 'lucide-react';
import TimelapseCard from './TimelapseCard';
import GenerateTimelapseModal from './GenerateTimelapseModal';
import { photoIntelService } from '../../services/api';

/**
 * Top-level gallery page that lists all timelapses, lets users filter by scope,
 * and opens the Generate modal. Used by both desktop & mobile wrappers.
 */
const TimelapseGallery = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scope, setScope] = useState('ALL');
    const [showModal, setShowModal] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const params = scope !== 'ALL' ? { scope } : {};
            const { data } = await photoIntelService.getTimelapses(params);
            setItems(Array.isArray(data) ? data : data.results || []);
        } catch (e) {
            console.error('Timelapse load error', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [scope]);

    const scopes = ['ALL', 'ROOM', 'FLOOR', 'PHASE', 'PROJECT'];

    return (
        <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold inline-flex items-center gap-2">
                    <Film className="w-5 h-5" /> Timelapses
                </h2>
                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1 text-xs">
                        <Filter className="w-3 h-3 ml-1 text-gray-500" />
                        {scopes.map((s) => (
                            <button
                                key={s}
                                onClick={() => setScope(s)}
                                className={`px-2 py-1 rounded ${scope === s ? 'bg-white shadow' : 'text-gray-600'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg"
                    >
                        <Plus className="w-4 h-4" /> New
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
            ) : items.length === 0 ? (
                <EmptyState onClick={() => setShowModal(true)} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((t) => (
                        <TimelapseCard key={t.id} timelapse={t} onChange={load} />
                    ))}
                </div>
            )}

            {showModal && (
                <GenerateTimelapseModal
                    onClose={() => setShowModal(false)}
                    onGenerated={() => { setShowModal(false); load(); }}
                />
            )}
        </div>
    );
};

const EmptyState = ({ onClick }) => (
    <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
        <Film className="w-10 h-10 mx-auto text-gray-400" />
        <div className="mt-2 font-medium text-gray-700">No timelapses yet</div>
        <p className="text-sm text-gray-500 mt-1">
            Upload site photos across dates, then generate your first timelapse.
        </p>
        <button
            onClick={onClick}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
            Generate timelapse
        </button>
    </div>
);

export default TimelapseGallery;
