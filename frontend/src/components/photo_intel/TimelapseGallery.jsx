import React, { useEffect, useMemo, useState } from 'react';
import { Film, Plus, Filter, Loader2 } from 'lucide-react';
import TimelapseCard from './TimelapseCard';
import GenerateTimelapseModal from './GenerateTimelapseModal';
import { photoIntelService } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';

/**
 * Top-level gallery page that lists all timelapses, lets users filter by scope,
 * and opens the Generate modal. Used by both desktop & mobile wrappers.
 */
const TimelapseGallery = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scope, setScope] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const { activeProjectId } = useConstruction();

    const load = async () => {
        setLoading(true);
        try {
            const params = { project: activeProjectId };
            if (scope !== 'ALL') params.scope = scope;
            const { data } = await photoIntelService.getTimelapses(params);
            setItems(Array.isArray(data) ? data : data.results || []);
        } catch (e) {
            console.error('Timelapse load error', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        if (activeProjectId) load(); 
    }, [scope, activeProjectId]);

    const scopes = [
        { id: 'ALL', label: 'All', icon: '🎬' },
        { id: 'PROJECT', label: 'Project', icon: '🏗️' },
        { id: 'PHASE', label: 'Phase', icon: '📅' },
        { id: 'FLOOR', label: 'Floor', icon: '🏢' },
        { id: 'ROOM', label: 'Room', icon: '🚪' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        <Film className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Visual Intelligence</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-[var(--t-text)]">Construction Timelapses</h1>
                    <p className="text-[var(--t-text3)] text-sm font-medium max-w-lg leading-relaxed">
                        Witness the evolution of your project through AI-compiled visual sequences. 
                        Track progress from excavation to finishing.
                    </p>
                </div>
                
                <button
                    onClick={() => setShowModal(true)}
                    className="group relative inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                    <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    New Sequence
                </button>
            </div>

            {/* ── Filters ── */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {scopes.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setScope(s.id)}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                            scope === s.id
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text3)] hover:border-blue-400 hover:text-blue-500'
                        }`}
                    >
                        <span>{s.icon}</span>
                        {s.label}
                    </button>
                ))}
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-40">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-sm font-black uppercase tracking-widest">Scanning sequences...</p>
                </div>
            ) : items.length === 0 ? (
                <EmptyState onClick={() => setShowModal(true)} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {items.map((t, idx) => (
                        <div key={t.id} style={{ animationDelay: `${idx * 100}ms` }} className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
                            <TimelapseCard timelapse={t} onChange={load} />
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <GenerateTimelapseModal
                    onClose={() => setShowModal(false)}
                    onGenerated={() => { setShowModal(false); load(); }}
                />
            )}

            {/* ── Help Note ── */}
            <div className="mt-12 p-6 rounded-[2rem] bg-blue-50/50 border border-blue-100 animate-in fade-in slide-in-from-bottom-8">
                <h3 className="text-lg font-black text-blue-900 mb-3 flex items-center gap-2">
                    <span>💡</span> कन्स्ट्रक्सन टाइमल्याप्स भनेको के हो र किन प्रयोग गर्ने? (Why use Timelapses?)
                </h3>
                <div className="text-sm font-medium text-blue-800/80 space-y-4 leading-relaxed mb-6 pb-6 border-b border-blue-200/50">
                    <p>
                        कन्स्ट्रक्सन टाइमल्याप्स भनेको निर्माण कार्य सुरु भएदेखि हालसम्म खिचिएका फोटोहरूलाई जोडेर बनाइएको एउटा छोटो भिडियो हो। घर बन्दै गरेको कुरालाई सेकेन्डभरमै भिडियोमा हेर्न सकिने हुनाले यो अत्यन्तै उपयोगी हुन्छ।
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong className="text-blue-900">प्रगति ट्र्याक गर्न (Track Progress):</strong> जग खनेदेखि घरको छत हाल्नेसम्मको काम कसरी भइरहेको छ भनेर सजिलै हेर्न सकिन्छ।</li>
                        <li><strong className="text-blue-900">रेकर्ड राख्न (Keep Records):</strong> कुन काम कुन मितिमा भयो भनेर भविष्यमा हेर्नको लागि बलियो प्रमाण हुन्छ।</li>
                        <li><strong className="text-blue-900">सेयर गर्न (Easy Sharing):</strong> घरधनी, इन्जिनियर वा परिवारसँग निर्माणको अवस्था देखाउन सजिलो हुन्छ।</li>
                    </ul>
                </div>

                <h3 className="text-lg font-black text-blue-900 mb-3 flex items-center gap-2">
                    <span>🛠️</span> प्रयोग गर्ने तरिका (How to use)
                </h3>
                <div className="text-sm font-medium text-blue-800/80 space-y-3 leading-relaxed">
                    <p>
                        <strong className="text-blue-900">१. फोटोहरू अपलोड गर्ने:</strong> आफ्नो प्रोजेक्टको Phases वा Tasks मा गएर सम्बन्धित काम भित्र "Media" मा क्लिक गरी साइटका फोटोहरू अपलोड गर्नुहोस्। 
                    </p>
                    <p>
                        <strong className="text-blue-900">२. टाइमल्याप्स बनाउने:</strong> माथि रहेको "New Sequence" बटनमा थिचेर आफूलाई चाहिएको दायरा (Scope) र मिति छानेर "Generate Sequence" मा क्लिक गर्नुहोस्।
                    </p>
                    <p>
                        <strong className="text-blue-900">प्रो-टिप:</strong> भिडियो राम्रो र स्पष्ट आउनको लागि, सकेसम्म दैनिक एउटै ठाउँ र एङ्गल (Angle) बाट फोटोहरू खिचेर अपलोड गर्नुहोला।
                    </p>
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ onClick }) => (
    <div className="group relative overflow-hidden rounded-[2.5rem] border-2 border-dashed border-[var(--t-border)] bg-[var(--t-surface2)]/50 p-20 text-center transition-all hover:border-blue-300 hover:bg-blue-50/10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-white shadow-xl flex items-center justify-center text-4xl">
                🎬
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl font-black text-[var(--t-text)]">No construction sequences found</h3>
                <p className="text-[var(--t-text3)] text-sm font-medium max-w-sm mx-auto leading-relaxed">
                    Once you upload site photos, we'll help you generate high-resolution timelapses to document your journey.
                </p>
            </div>
            <button
                onClick={onClick}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl border border-blue-100 hover:scale-105 transition-transform"
            >
                Generate First Sequence
            </button>
        </div>
    </div>
);

export default TimelapseGallery;
