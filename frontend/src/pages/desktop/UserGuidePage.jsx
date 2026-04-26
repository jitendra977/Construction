/**
 * UserGuidePage — full wiki-style knowledge base.
 *
 * Layout:
 *   Left sidebar  → all module guide cards, auto-populated from backend
 *   Right panel   → selected guide: description, steps, FAQ accordion,
 *                   user-contributed sections
 *
 * Permissions:
 *   Any authenticated user  → can read everything, add steps / FAQs / sections
 *   Admin                   → can also edit guide metadata, delete any content
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { dashboardService } from '../../services/api';
import ConfirmModal from '../../components/common/ConfirmModal';

// ── Section-type config ───────────────────────────────────────────────────────
const SECTION_TYPES = [
    { value: 'tip',     label: '💡 Tip',       color: '#10b981', bg: '#10b98112' },
    { value: 'warning', label: '⚠️ Warning',   color: '#f59e0b', bg: '#f59e0b12' },
    { value: 'note',    label: '📝 Note',       color: '#6366f1', bg: '#6366f112' },
    { value: 'trick',   label: '🎯 Pro Trick',  color: '#ec4899', bg: '#ec489912' },
    { value: 'custom',  label: '📌 Custom',     color: '#64748b', bg: '#64748b12' },
];
const sectionTypeMeta = (type) =>
    SECTION_TYPES.find(t => t.value === type) || SECTION_TYPES[2];

// ── Small utilities ───────────────────────────────────────────────────────────
function Avatar({ name, size = 28 }) {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const colors   = ['#6366f1','#f97316','#10b981','#ec4899','#3b82f6','#8b5cf6'];
    const bg       = colors[(initials.charCodeAt(0) || 0) % colors.length];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: size, height: size, borderRadius: '50%',
            background: bg, color: '#fff', fontSize: size * 0.38,
            fontWeight: 900, flexShrink: 0, letterSpacing: '-0.5px',
        }}>{initials}</span>
    );
}

function Tag({ children, color }) {
    return (
        <span style={{
            fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
            letterSpacing: '0.12em', padding: '2px 8px', borderRadius: 999,
            background: color + '18', color, border: `1px solid ${color}30`,
        }}>{children}</span>
    );
}

// ── Inline add-form for steps ─────────────────────────────────────────────────
function AddStepForm({ guideId, onSaved, onCancel, language }) {
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!text.trim()) return;
        setSaving(true);
        try {
            await dashboardService.createGuideStep({
                guide:   guideId,
                text_en: language === 'en' ? text : '',
                text_ne: language === 'ne' ? text : '',
                order:   999,
            });
            onSaved();
        } catch { alert('Failed to save step.'); }
        finally   { setSaving(false); }
    };

    return (
        <div className="rounded-2xl p-4 space-y-3"
            style={{ background: 'var(--t-primary)08', border: '1.5px dashed var(--t-primary)40' }}>
            <textarea
                autoFocus rows={2}
                value={text} onChange={e => setText(e.target.value)}
                placeholder={language === 'en' ? 'Describe the step…' : 'चरण विवरण…'}
                className="w-full bg-transparent text-sm font-medium resize-none outline-none"
                style={{ color: 'var(--t-text)' }}
            />
            <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="px-3 py-1.5 rounded-xl text-xs font-black"
                    style={{ background: 'var(--t-surface2)', color: 'var(--t-text3)' }}>Cancel</button>
                <button onClick={save} disabled={saving || !text.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-black disabled:opacity-40"
                    style={{ background: 'var(--t-primary)', color: '#fff' }}>
                    {saving ? 'Saving…' : 'Add Step'}
                </button>
            </div>
        </div>
    );
}

// ── Inline add-form for FAQs ──────────────────────────────────────────────────
function AddFaqForm({ guideId, onSaved, onCancel, language }) {
    const [q, setQ] = useState('');
    const [a, setA] = useState('');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!q.trim() || !a.trim()) return;
        setSaving(true);
        try {
            await dashboardService.createGuideFaq({
                guide:       guideId,
                question_en: language === 'en' ? q : '',
                question_ne: language === 'ne' ? q : '',
                answer_en:   language === 'en' ? a : '',
                answer_ne:   language === 'ne' ? a : '',
                order:       999,
            });
            onSaved();
        } catch { alert('Failed to save FAQ.'); }
        finally   { setSaving(false); }
    };

    return (
        <div className="rounded-2xl p-4 space-y-3"
            style={{ background: 'var(--t-primary)08', border: '1.5px dashed var(--t-primary)40' }}>
            <input value={q} onChange={e => setQ(e.target.value)}
                placeholder={language === 'en' ? 'Question…' : 'प्रश्न…'}
                className="w-full bg-transparent text-sm font-bold outline-none border-b pb-2"
                style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
            />
            <textarea rows={2} value={a} onChange={e => setA(e.target.value)}
                placeholder={language === 'en' ? 'Answer…' : 'उत्तर…'}
                className="w-full bg-transparent text-sm font-medium resize-none outline-none"
                style={{ color: 'var(--t-text)' }}
            />
            <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="px-3 py-1.5 rounded-xl text-xs font-black"
                    style={{ background: 'var(--t-surface2)', color: 'var(--t-text3)' }}>Cancel</button>
                <button onClick={save} disabled={saving || !q.trim() || !a.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-black disabled:opacity-40"
                    style={{ background: 'var(--t-primary)', color: '#fff' }}>
                    {saving ? 'Saving…' : 'Add FAQ'}
                </button>
            </div>
        </div>
    );
}

// ── Inline add-form for sections ─────────────────────────────────────────────
function AddSectionForm({ guideId, onSaved, onCancel, language }) {
    const [type,    setType]    = useState('note');
    const [title,   setTitle]   = useState('');
    const [content, setContent] = useState('');
    const [saving,  setSaving]  = useState(false);

    const save = async () => {
        if (!title.trim() || !content.trim()) return;
        setSaving(true);
        try {
            await dashboardService.createGuideSection({
                guide:        guideId,
                section_type: type,
                title_en:     language === 'en' ? title : '',
                title_ne:     language === 'ne' ? title : '',
                content_en:   language === 'en' ? content : '',
                content_ne:   language === 'ne' ? content : '',
                order:        999,
            });
            onSaved();
        } catch { alert('Failed to save section.'); }
        finally   { setSaving(false); }
    };

    const meta = sectionTypeMeta(type);

    return (
        <div className="rounded-2xl p-4 space-y-3"
            style={{ background: meta.bg, border: `1.5px dashed ${meta.color}50` }}>
            <div className="flex flex-wrap gap-2">
                {SECTION_TYPES.map(t => (
                    <button key={t.value} onClick={() => setType(t.value)}
                        className="px-3 py-1 rounded-xl text-[10px] font-black transition-all"
                        style={{
                            background: type === t.value ? t.color : 'var(--t-surface)',
                            color:      type === t.value ? '#fff' : 'var(--t-text3)',
                            border:     `1px solid ${type === t.value ? t.color : 'var(--t-border)'}`,
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>
            <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder={language === 'en' ? 'Section title…' : 'शीर्षक…'}
                className="w-full bg-transparent text-sm font-bold outline-none border-b pb-2"
                style={{ borderColor: `${meta.color}40`, color: 'var(--t-text)' }}
            />
            <textarea rows={3} value={content} onChange={e => setContent(e.target.value)}
                placeholder={language === 'en' ? 'Content…' : 'सामग्री…'}
                className="w-full bg-transparent text-sm font-medium resize-none outline-none"
                style={{ color: 'var(--t-text)' }}
            />
            <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="px-3 py-1.5 rounded-xl text-xs font-black"
                    style={{ background: 'var(--t-surface2)', color: 'var(--t-text3)' }}>Cancel</button>
                <button onClick={save} disabled={saving || !title.trim() || !content.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-black disabled:opacity-40"
                    style={{ background: meta.color, color: '#fff' }}>
                    {saving ? 'Saving…' : 'Add Section'}
                </button>
            </div>
        </div>
    );
}

// ── FAQ Accordion item ────────────────────────────────────────────────────────
function FaqItem({ faq, isAdmin, isAuthor, lang, onDelete }) {
    const [open, setOpen] = useState(false);
    const q = lang === 'ne' && faq.question_ne ? faq.question_ne : faq.question_en;
    const a = lang === 'ne' && faq.answer_ne   ? faq.answer_ne   : faq.answer_en;

    return (
        <div className="rounded-2xl overflow-hidden transition-all"
            style={{ border: '1px solid var(--t-border)', background: open ? 'var(--t-surface)' : 'transparent' }}>
            <button className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                onClick={() => setOpen(!open)}>
                <span className="text-sm font-bold flex-1" style={{ color: 'var(--t-text)' }}>{q}</span>
                <div className="flex items-center gap-2 shrink-0">
                    {faq.added_by_name && (
                        <span className="text-[9px] font-bold opacity-40 hidden sm:block">{faq.added_by_name}</span>
                    )}
                    <span className="text-base transition-transform inline-block"
                        style={{ transform: open ? 'rotate(180deg)' : '' }}>⌄</span>
                </div>
            </button>
            {open && (
                <div className="px-5 pb-5">
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text2)' }}>{a}</p>
                    {(isAdmin || isAuthor) && (
                        <button onClick={() => onDelete(faq.id)}
                            className="mt-3 text-[10px] font-black uppercase text-red-400 hover:text-red-500">
                            🗑 Delete
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ sec, isAdmin, isAuthor, lang, onDelete }) {
    const meta  = sectionTypeMeta(sec.section_type);
    const title = lang === 'ne' && sec.title_ne   ? sec.title_ne   : sec.title_en;
    const body  = lang === 'ne' && sec.content_ne ? sec.content_ne : sec.content_en;

    return (
        <div className="rounded-2xl p-5 relative group"
            style={{ background: meta.bg, border: `1.5px solid ${meta.color}30` }}>
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Tag color={meta.color}>{meta.label}</Tag>
                    <span className="text-sm font-black" style={{ color: meta.color }}>{title}</span>
                </div>
                {(isAdmin || isAuthor) && (
                    <button onClick={() => onDelete(sec.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 text-sm transition-opacity shrink-0">✕</button>
                )}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--t-text2)' }}>{body}</p>
            {sec.added_by_name && (
                <div className="flex items-center gap-1.5 mt-3">
                    <Avatar name={sec.added_by_name} size={18} />
                    <span className="text-[9px] font-bold opacity-40">{sec.added_by_name}</span>
                </div>
            )}
        </div>
    );
}

// ── Admin metadata editor (guide title / description / icon) ─────────────────
function GuideMetaEditor({ guide, onClose, onSaved }) {
    const [form, setForm] = useState({
        icon:           guide.icon,
        title_en:       guide.title_en,
        title_ne:       guide.title_ne,
        description_en: guide.description_en,
        description_ne: guide.description_ne,
        video_url:      guide.video_url || '',
        is_active:      guide.is_active,
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await dashboardService.updateUserGuide(guide.id, form);
            onSaved();
        } catch { alert('Save failed.'); }
        finally   { setSaving(false); }
    };

    const F = (label, key, multiline = false) => (
        <div>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-1">{label}</label>
            {multiline
                ? <textarea rows={3} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full text-sm bg-black/5 border border-[var(--t-border)] rounded-xl p-3 resize-none font-medium" />
                : <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full text-sm bg-black/5 border border-[var(--t-border)] rounded-xl p-3 font-medium" />
            }
        </div>
    );

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
            <div className="w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--t-border)' }}>
                    <h2 className="text-lg font-black" style={{ color: 'var(--t-text)' }}>Edit Guide Metadata</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-black/10 text-lg transition-colors">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="flex gap-3">
                        <div className="w-24">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-1">Icon</label>
                            <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
                                className="w-full text-2xl text-center bg-black/5 border border-[var(--t-border)] rounded-xl p-3" />
                        </div>
                        <div className="flex-1">{F('Title (EN)', 'title_en')}</div>
                    </div>
                    {F('Title (NE)', 'title_ne')}
                    {F('Description (EN)', 'description_en', true)}
                    {F('Description (NE)', 'description_ne', true)}
                    {F('Video URL', 'video_url')}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.is_active}
                            onChange={e => setForm({ ...form, is_active: e.target.checked })}
                            className="w-4 h-4 accent-[var(--t-primary)]" />
                        <span className="text-xs font-black uppercase tracking-widest">Publicly Active</span>
                    </label>
                </div>
                <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: 'var(--t-border)' }}>
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-black"
                        style={{ background: 'var(--t-surface2)', color: 'var(--t-text3)' }}>Cancel</button>
                    <button onClick={save} disabled={saving}
                        className="px-6 py-2 rounded-xl text-xs font-black disabled:opacity-50"
                        style={{ background: 'var(--t-primary)', color: '#fff' }}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserGuidePage() {
    const { dashboardData, user, language, refreshData } = useConstruction();
    const rawGuides = dashboardData?.userGuides || [];
    const isAdmin   = !!user?.is_system_admin;
    const lang      = language || 'en';

    // State
    const [search,        setSearch]        = useState('');
    const [selectedKey,   setSelectedKey]   = useState(null);
    const [addingStep,    setAddingStep]     = useState(false);
    const [addingFaq,     setAddingFaq]      = useState(false);
    const [addingSection, setAddingSection]  = useState(false);
    const [editingMeta,   setEditingMeta]    = useState(false);
    const [formLang,      setFormLang]       = useState(lang);
    const [confirm,       setConfirm]        = useState({ open: false });
    const contentRef = useRef(null);

    // Guides list (admins see inactive too)
    const guides = useMemo(() =>
        rawGuides.filter(g => {
            if (!isAdmin && !g.is_active) return false;
            const q = search.toLowerCase();
            return (g.title_en.toLowerCase().includes(q) || (g.title_ne || '').includes(q));
        }),
        [rawGuides, isAdmin, search]
    );

    const selected = useMemo(() => rawGuides.find(g => g.key === selectedKey), [rawGuides, selectedKey]);

    const selectGuide = useCallback((key) => {
        setSelectedKey(key);
        setAddingStep(false);
        setAddingFaq(false);
        setAddingSection(false);
        setEditingMeta(false);
        if (contentRef.current) contentRef.current.scrollTop = 0;
    }, []);

    const afterContribute = () => {
        refreshData();
        setAddingStep(false);
        setAddingFaq(false);
        setAddingSection(false);
    };

    // Delete helpers
    const askDelete = (title, onConfirm) =>
        setConfirm({ open: true, title, message: 'This cannot be undone.', confirmText: 'Delete', type: 'danger', onConfirm });

    const deleteStep = (id) => askDelete('Delete Step?', async () => {
        await dashboardService.deleteGuideStep(id);
        refreshData(); setConfirm({ open: false });
    });
    const deleteFaq = (id) => askDelete('Delete FAQ?', async () => {
        await dashboardService.deleteGuideFaq(id);
        refreshData(); setConfirm({ open: false });
    });
    const deleteSection = (id) => askDelete('Delete Section?', async () => {
        await dashboardService.deleteGuideSection(id);
        refreshData(); setConfirm({ open: false });
    });

    // Display text helper
    const T = (en, ne) => (formLang === 'ne' && ne) ? ne : en;

    // Canonical module order for sidebar
    const MODULE_ORDER = [
        'home_dashboard','projects_module','finance_module','resource_module',
        'structure_module','timeline_module','accounts_module',
        'analytics_page','estimator_page','permits_page','photos_timelapse','data_import',
    ];
    const sortedGuides = [...guides].sort((a, b) => {
        const ai = MODULE_ORDER.indexOf(a.key); const bi = MODULE_ORDER.indexOf(b.key);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1; if (bi !== -1) return 1;
        return a.order - b.order;
    });

    return (
        <div className="flex" style={{ minHeight: '100vh', background: 'var(--t-bg)' }}>

            {/* ── LEFT SIDEBAR ──────────────────────────────────────────── */}
            <aside className="hidden md:flex flex-col shrink-0 border-r overflow-hidden"
                style={{
                    width: 272,
                    borderColor: 'var(--t-border)',
                    background: 'var(--t-surface)',
                    position: 'sticky', top: 0, height: '100vh',
                }}>

                {/* Sidebar header */}
                <div className="p-5 border-b shrink-0" style={{ borderColor: 'var(--t-border)' }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{ background: 'var(--t-primary)15' }}>📚</div>
                        <div>
                            <p className="text-base font-black" style={{ color: 'var(--t-text)' }}>User Guide</p>
                            <p className="text-[9px] font-bold uppercase tracking-[0.18em]"
                                style={{ color: 'var(--t-primary)' }}>Knowledge Base</p>
                        </div>
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-30">🔍</span>
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search guides…"
                            className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl outline-none"
                            style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
                        />
                    </div>
                </div>

                {/* Guide list */}
                <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                    {sortedGuides.length === 0 && (
                        <div className="text-center py-12 opacity-30">
                            <p className="text-3xl mb-2">🔍</p>
                            <p className="text-xs font-bold">No guides found</p>
                        </div>
                    )}
                    {sortedGuides.map(g => {
                        const isActive = g.key === selectedKey;
                        const title    = T(g.title_en, g.title_ne);
                        return (
                            <button key={g.key} onClick={() => selectGuide(g.key)}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
                                style={{
                                    background: isActive ? 'var(--t-primary)15' : 'transparent',
                                    border:     isActive ? '1px solid var(--t-primary)30' : '1px solid transparent',
                                }}>
                                <span className="text-2xl shrink-0">{g.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black truncate"
                                        style={{ color: isActive ? 'var(--t-primary)' : 'var(--t-text)' }}>{title}</p>
                                    <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5"
                                        style={{ color: 'var(--t-text3)' }}>
                                        {g.steps?.length || 0} steps · {g.faqs?.length || 0} FAQs
                                        {!g.is_active && <span className="ml-1 text-amber-500">· Draft</span>}
                                    </p>
                                </div>
                                {isActive && <span style={{ color: 'var(--t-primary)', fontSize: 10 }}>▶</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t shrink-0" style={{ borderColor: 'var(--t-border)' }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-30 text-center">
                        {sortedGuides.length} guide{sortedGuides.length !== 1 ? 's' : ''} available
                    </p>
                </div>
            </aside>

            {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
            <div ref={contentRef} className="flex-1 overflow-y-auto" style={{ paddingBottom: 96 }}>

                {/* No guide selected — landing / grid view */}
                {!selected && (
                    <div className="p-8 max-w-5xl mx-auto">
                        {/* Hero */}
                        <div className="rounded-[2.5rem] p-10 mb-10 relative overflow-hidden"
                            style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-5"
                                style={{ background: 'var(--t-primary)' }} />
                            <div className="relative z-10">
                                <p className="text-6xl mb-4">📚</p>
                                <h1 className="text-4xl font-black mb-3" style={{ color: 'var(--t-text)' }}>
                                    User Guide &amp; <span style={{ color: 'var(--t-primary)' }}>Knowledge Base</span>
                                </h1>
                                <p className="text-base font-medium max-w-2xl" style={{ color: 'var(--t-text2)' }}>
                                    Step-by-step guides for every HCMS module. Select a module from the sidebar
                                    or click any card below — then add your own tips, FAQs, and notes.
                                </p>
                            </div>
                        </div>

                        {/* Mobile search (visible only on small screens) */}
                        <div className="md:hidden mb-6 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search guides…"
                                className="w-full pl-9 pr-3 py-3 rounded-2xl text-sm font-medium outline-none"
                                style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
                            />
                        </div>

                        {/* Guide grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {sortedGuides.map(g => (
                                <button key={g.key} onClick={() => selectGuide(g.key)}
                                    className="group text-left p-6 rounded-[1.75rem] transition-all hover:-translate-y-1 hover:shadow-xl"
                                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 transition-transform group-hover:scale-110"
                                        style={{ background: 'var(--t-primary)10' }}>
                                        {g.icon}
                                    </div>
                                    <h3 className="text-base font-black mb-1 group-hover:text-[var(--t-primary)] transition-colors"
                                        style={{ color: 'var(--t-text)' }}>
                                        {T(g.title_en, g.title_ne)}
                                    </h3>
                                    <p className="text-xs font-medium line-clamp-2 mb-4"
                                        style={{ color: 'var(--t-text3)' }}>
                                        {T(g.description_en, g.description_ne)}
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        <Tag color="var(--t-primary)">{g.steps?.length || 0} Steps</Tag>
                                        <Tag color="#10b981">{g.faqs?.length || 0} FAQs</Tag>
                                        {(g.sections?.length > 0) && (
                                            <Tag color="#8b5cf6">{g.sections.length} Notes</Tag>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── GUIDE DETAIL VIEW ─────────────────────────────────── */}
                {selected && (
                    <div className="max-w-3xl mx-auto p-6 space-y-10">

                        {/* Top bar: back + language + admin edit */}
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <button onClick={() => setSelectedKey(null)}
                                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-opacity hover:opacity-100 opacity-60"
                                style={{ color: 'var(--t-text)' }}>
                                ← All Guides
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="flex bg-black/10 p-1 rounded-xl border" style={{ borderColor: 'var(--t-border)' }}>
                                    {['en','ne'].map(l => (
                                        <button key={l} onClick={() => setFormLang(l)}
                                            className="px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all"
                                            style={{
                                                background: formLang === l ? 'var(--t-surface)' : 'transparent',
                                                color:      formLang === l ? 'var(--t-primary)' : 'var(--t-text3)',
                                                boxShadow:  formLang === l ? '0 1px 4px rgba(0,0,0,.15)' : 'none',
                                            }}>{l === 'en' ? 'EN' : 'ने'}</button>
                                    ))}
                                </div>
                                {isAdmin && (
                                    <button onClick={() => setEditingMeta(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all"
                                        style={{ background: 'var(--t-surface2)', color: 'var(--t-text3)', border: '1px solid var(--t-border)' }}>
                                        ⚙️ Edit Guide
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Guide header card */}
                        <div className="rounded-[2rem] p-8 relative overflow-hidden"
                            style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                            <div className="absolute -bottom-10 -right-10 text-[120px] opacity-[0.04] select-none pointer-events-none">
                                {selected.icon}
                            </div>
                            <div className="relative z-10 flex items-start gap-5">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                                    style={{ background: 'var(--t-primary)15' }}>{selected.icon}</div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 flex-wrap mb-2">
                                        <h1 className="text-2xl font-black" style={{ color: 'var(--t-text)' }}>
                                            {T(selected.title_en, selected.title_ne)}
                                        </h1>
                                        {!selected.is_active && <Tag color="#f59e0b">Draft</Tag>}
                                    </div>
                                    <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--t-text2)' }}>
                                        {T(selected.description_en, selected.description_ne)}
                                    </p>
                                    {selected.video_url && (
                                        <a href={selected.video_url} target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 mt-4 text-xs font-black"
                                            style={{ color: 'var(--t-primary)' }}>
                                            ▶ Watch Video Tutorial
                                        </a>
                                    )}
                                    <div className="flex gap-3 mt-4 flex-wrap">
                                        <Tag color="var(--t-primary)">{selected.steps?.length || 0} Steps</Tag>
                                        <Tag color="#10b981">{selected.faqs?.length || 0} FAQs</Tag>
                                        {(selected.sections?.length > 0) && (
                                            <Tag color="#8b5cf6">{selected.sections.length} Community Notes</Tag>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── STEPS ───────────────────────────────────────── */}
                        <section>
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                                        style={{ background: 'var(--t-primary)15' }}>📋</div>
                                    <h2 className="text-base font-black uppercase tracking-wide" style={{ color: 'var(--t-text)' }}>
                                        Step-by-Step Guide
                                    </h2>
                                </div>
                                <button onClick={() => { setAddingStep(true); setAddingFaq(false); setAddingSection(false); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase"
                                    style={{ background: 'var(--t-primary)15', color: 'var(--t-primary)', border: '1px solid var(--t-primary)30' }}>
                                    + Add Step
                                </button>
                            </div>

                            {(selected.steps?.length === 0 && !addingStep) && (
                                <div className="text-center py-10 rounded-2xl"
                                    style={{ border: '1.5px dashed var(--t-border)', opacity: 0.5 }}>
                                    <p className="text-3xl mb-2">📭</p>
                                    <p className="text-xs font-bold">No steps yet — be the first to add one!</p>
                                </div>
                            )}

                            <div className="space-y-3">
                                {(selected.steps || []).map((step, idx) => {
                                    const text   = formLang === 'ne' && step.text_ne ? step.text_ne : step.text_en;
                                    const canDel = isAdmin || step.added_by === user?.id;
                                    const isLast = idx === (selected.steps?.length - 1);
                                    return (
                                        <div key={step.id} className="flex gap-4 group relative">
                                            <div className="flex flex-col items-center shrink-0">
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
                                                    style={{ background: 'var(--t-primary)', color: '#fff' }}>{idx + 1}</div>
                                                {!isLast && (
                                                    <div className="w-px flex-1 my-1.5 min-h-[16px]"
                                                        style={{ background: 'var(--t-border)' }} />
                                                )}
                                            </div>
                                            <div className="flex-1 pb-3">
                                                <p className="text-sm leading-relaxed font-medium pt-1.5"
                                                    style={{ color: 'var(--t-text)' }}>{text}</p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    {step.added_by_name && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Avatar name={step.added_by_name} size={16} />
                                                            <span className="text-[9px] font-bold opacity-40">{step.added_by_name}</span>
                                                        </div>
                                                    )}
                                                    {canDel && (
                                                        <button onClick={() => deleteStep(step.id)}
                                                            className="opacity-0 group-hover:opacity-100 text-[9px] font-black text-red-400 hover:text-red-500 transition-opacity uppercase tracking-widest">
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {addingStep && (
                                    <div className="flex gap-4">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 opacity-30"
                                            style={{ background: 'var(--t-primary)', color: '#fff' }}>
                                            {(selected.steps?.length || 0) + 1}
                                        </div>
                                        <div className="flex-1">
                                            <AddStepForm
                                                guideId={selected.id} language={formLang}
                                                onSaved={afterContribute} onCancel={() => setAddingStep(false)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── FAQs ────────────────────────────────────────── */}
                        <section>
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                                        style={{ background: '#10b98115' }}>❓</div>
                                    <h2 className="text-base font-black uppercase tracking-wide" style={{ color: 'var(--t-text)' }}>
                                        Frequently Asked Questions
                                    </h2>
                                </div>
                                <button onClick={() => { setAddingFaq(true); setAddingStep(false); setAddingSection(false); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase"
                                    style={{ background: '#10b98115', color: '#10b981', border: '1px solid #10b98130' }}>
                                    + Add FAQ
                                </button>
                            </div>

                            {(selected.faqs?.length === 0 && !addingFaq) && (
                                <div className="text-center py-10 rounded-2xl"
                                    style={{ border: '1.5px dashed var(--t-border)', opacity: 0.5 }}>
                                    <p className="text-3xl mb-2">💬</p>
                                    <p className="text-xs font-bold">No FAQs yet — add the first question!</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                {(selected.faqs || []).map(faq => (
                                    <FaqItem key={faq.id} faq={faq} lang={formLang}
                                        isAdmin={isAdmin} isAuthor={faq.added_by === user?.id}
                                        onDelete={deleteFaq}
                                    />
                                ))}
                                {addingFaq && (
                                    <AddFaqForm
                                        guideId={selected.id} language={formLang}
                                        onSaved={afterContribute} onCancel={() => setAddingFaq(false)}
                                    />
                                )}
                            </div>
                        </section>

                        {/* ── COMMUNITY SECTIONS ──────────────────────────── */}
                        <section>
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                                        style={{ background: '#8b5cf615' }}>🌐</div>
                                    <div>
                                        <h2 className="text-base font-black uppercase tracking-wide" style={{ color: 'var(--t-text)' }}>
                                            Tips, Warnings &amp; Notes
                                        </h2>
                                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Community contributions</p>
                                    </div>
                                </div>
                                <button onClick={() => { setAddingSection(true); setAddingStep(false); setAddingFaq(false); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase"
                                    style={{ background: '#8b5cf615', color: '#8b5cf6', border: '1px solid #8b5cf630' }}>
                                    + Add Note
                                </button>
                            </div>

                            {((selected.sections || []).filter(s => isAdmin || s.is_approved).length === 0 && !addingSection) && (
                                <div className="text-center py-10 rounded-2xl"
                                    style={{ border: '1.5px dashed var(--t-border)', opacity: 0.5 }}>
                                    <p className="text-3xl mb-2">✍️</p>
                                    <p className="text-xs font-bold">Share a tip, warning, or pro trick with your team!</p>
                                </div>
                            )}

                            <div className="space-y-3">
                                {(selected.sections || [])
                                    .filter(s => isAdmin || s.is_approved)
                                    .map(sec => (
                                        <SectionCard key={sec.id} sec={sec} lang={formLang}
                                            isAdmin={isAdmin} isAuthor={sec.added_by === user?.id}
                                            onDelete={deleteSection}
                                        />
                                    ))
                                }
                                {addingSection && (
                                    <AddSectionForm
                                        guideId={selected.id} language={formLang}
                                        onSaved={afterContribute} onCancel={() => setAddingSection(false)}
                                    />
                                )}
                            </div>

                            {/* Contribution prompt bar */}
                            {!addingStep && !addingFaq && !addingSection && (
                                <div className="mt-6 p-5 rounded-2xl flex items-center gap-4 flex-wrap"
                                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                                    <Avatar name={user?.username || 'You'} size={36} />
                                    <div className="flex-1 min-w-[120px]">
                                        <p className="text-xs font-black" style={{ color: 'var(--t-text)' }}>
                                            Have something to add?
                                        </p>
                                        <p className="text-[10px] font-medium opacity-40">
                                            Share knowledge to help your team.
                                        </p>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <button onClick={() => setAddingStep(true)}
                                            className="px-3 py-1.5 rounded-xl text-[10px] font-black"
                                            style={{ background: 'var(--t-primary)15', color: 'var(--t-primary)', border: '1px solid var(--t-primary)25' }}>
                                            + Step
                                        </button>
                                        <button onClick={() => setAddingFaq(true)}
                                            className="px-3 py-1.5 rounded-xl text-[10px] font-black"
                                            style={{ background: '#10b98115', color: '#10b981', border: '1px solid #10b98125' }}>
                                            + FAQ
                                        </button>
                                        <button onClick={() => setAddingSection(true)}
                                            className="px-3 py-1.5 rounded-xl text-[10px] font-black"
                                            style={{ background: '#8b5cf615', color: '#8b5cf6', border: '1px solid #8b5cf625' }}>
                                            + Note
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>

                    </div>
                )}
            </div>

            {/* ── Admin metadata editor modal ───────────────────────────── */}
            {editingMeta && selected && (
                <GuideMetaEditor
                    guide={selected}
                    onClose={() => setEditingMeta(false)}
                    onSaved={() => { refreshData(); setEditingMeta(false); }}
                />
            )}

            {/* ── Confirm modal ─────────────────────────────────────────── */}
            <ConfirmModal
                isOpen={confirm.open}
                title={confirm.title}
                message={confirm.message}
                confirmText={confirm.confirmText}
                type={confirm.type || 'danger'}
                onConfirm={confirm.onConfirm}
                onCancel={() => setConfirm({ open: false })}
            />
        </div>
    );
}
