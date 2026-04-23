import React, { useEffect, useState } from 'react';
import { FileCheck2, Loader2, Sparkles } from 'lucide-react';
import { permitCopilotService } from '../../services/api';

/**
 * Permit Co-Pilot wizard — picks a municipality template and materialises
 * a per-project checklist. Displays the resulting items inline.
 */
const PermitWizard = ({ projectId }) => {
    const [templates, setTemplates] = useState([]);
    const [selected, setSelected] = useState('');
    const [checklist, setChecklist] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadTemplates = async () => {
        const { data } = await permitCopilotService.getTemplates();
        const rows = Array.isArray(data) ? data : data.results || [];
        setTemplates(rows);
        if (!rows.length) {
            try {
                await permitCopilotService.seedKathmandu();
                const again = await permitCopilotService.getTemplates();
                setTemplates(Array.isArray(again.data) ? again.data : again.data.results || []);
            } catch {
                /* ignore */
            }
        }
    };

    useEffect(() => { loadTemplates(); }, []);

    const start = async () => {
        if (!projectId || !selected) {
            setError('Project and template are required.');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const { data } = await permitCopilotService.materialiseChecklist({
                project_id: projectId,
                template_id: selected,
            });
            setChecklist(data);
        } catch (e) {
            setError(e?.response?.data?.error || 'Failed to start checklist.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold inline-flex items-center gap-2 mb-3">
                    <FileCheck2 className="w-4 h-4 text-indigo-600" /> Permit Co-Pilot
                </h3>

                <div className="flex items-end gap-3">
                    <label className="flex-1">
                        <span className="block text-xs text-gray-500 mb-0.5">Municipality template</span>
                        <select
                            className="w-full border rounded-md px-2 py-1 text-sm"
                            value={selected}
                            onChange={(e) => setSelected(e.target.value)}
                        >
                            <option value="">— choose —</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} ({t.municipality})
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        onClick={start}
                        disabled={loading || !selected}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center gap-1"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Start Checklist
                    </button>
                </div>
                {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
            </div>

            {checklist && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-semibold">{checklist.template_name}</h3>
                            <div className="text-xs text-gray-500">
                                Progress: {checklist.progress_pct}% · Target:{' '}
                                {checklist.target_completion || '—'}
                            </div>
                        </div>
                    </div>
                    <ol className="space-y-2 text-sm">
                        {checklist.items?.map((it) => (
                            <li
                                key={it.id}
                                className="p-2 rounded border flex items-start justify-between gap-3"
                            >
                                <div className="min-w-0">
                                    <div className="font-medium">{it.order}. {it.title}</div>
                                    {it.description && (
                                        <div className="text-xs text-gray-500">{it.description}</div>
                                    )}
                                </div>
                                <div className="text-right text-xs">
                                    <div className="text-gray-500">due {it.due_date}</div>
                                    <span
                                        className={`inline-block mt-1 px-2 py-0.5 rounded ${statusStyles[it.status] || 'bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        {it.status}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
};

const statusStyles = {
    TODO: 'bg-gray-100 text-gray-700',
    GATHERING: 'bg-amber-100 text-amber-800',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    DONE: 'bg-green-100 text-green-800',
    BLOCKED: 'bg-red-100 text-red-800',
};

export default PermitWizard;
