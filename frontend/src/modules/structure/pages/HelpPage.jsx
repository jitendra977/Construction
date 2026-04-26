import React, { useState } from 'react';

const SECTIONS = [
    {
        id: 'overview',
        icon: '🏗️',
        title: 'Overview — के हो?',
        color: '#ea580c',
        content: [
            { q: 'Structure module किन छ?', a: 'यो module तपाईंको घरको तल्ला (floors) र कोठाहरू (rooms) को नक्सा बनाउन र निर्माण प्रगति ट्र्याक गर्न बनाइएको हो।' },
            { q: 'कसले प्रयोग गर्ने?', a: 'Project manager, site engineer, वा ठेकेदारले प्रयोग गर्छन् — जसलाई घरको layout बुझ्नु छ।' },
            { q: 'कहिले सुरु गर्ने?', a: 'Project सुरु भएपछि सबैभन्दा पहिले तल्लाहरू र कोठाहरू यहाँ दर्ता गर्नुस्।' },
        ],
    },
    {
        id: 'floorplan',
        icon: '🗺️',
        title: 'Floor Plan — नक्सा बनाउने',
        color: '#3b82f6',
        content: [
            { q: 'Floor Plan tab कसरी प्रयोग गर्ने?', a: 'यहाँ SVG canvas मा तपाईंको घरको 2D नक्सा बनाउन सकिन्छ। माउस scroll गरेर zoom गर्नुस्, drag गरेर कोठा सार्नुस्।' },
            { q: 'कोठा कसरी थप्ने?', a: '"+ Add Room" बटन क्लिक गर्नुस् वा canvas मा नयाँ कोठाको नाम राख्नुस्। कोठा राखेपछि drag गरेर ठाउँ मिलाउन सकिन्छ।' },
            { q: 'Shape (आकार) कसरी बदल्ने?', a: 'कोठा select गरेपछि right panel मा Shape section देखिन्छ। Rectangle, L, U, T आकारहरू छान्न सकिन्छ।' },
            { q: 'तल्ला (floor) थप्ने कसरी?', a: '"+ Floor" बटन क्लिक गरी नयाँ तल्ला थप्नुस्। Building को Width र Depth cm मा राख्नुस् — 1 metre = 100 cm।' },
            { q: 'कोठाको size कसरी राख्ने?', a: 'Inspector panel मा W (width) र D (depth) cm मा भर्नुस्। Square footage आफैं calculate हुन्छ।' },
        ],
    },
    {
        id: 'rooms',
        icon: '🚪',
        title: 'Rooms — कोठा व्यवस्थापन',
        color: '#8b5cf6',
        content: [
            { q: 'कोठाको status कसरी बदल्ने?', a: 'Rooms tab मा कुनै कोठामा click गर्नुस् र status बदल्नुस्: Not Started → In Progress → Completed।' },
            { q: 'Budget allocation किन राख्ने?', a: 'प्रत्येक कोठाको निर्माण लागत अनुमान राख्दा कुन कोठामा कति खर्च भयो थाहा पाउन सजिलो हुन्छ।' },
            { q: 'Filter कसरी गर्ने?', a: 'Floor, Status, र Search बाट कोठाहरू filter गर्न सकिन्छ। धेरै कोठा भएको बेला यो उपयोगी हुन्छ।' },
            { q: 'कोठा delete गर्न मिल्छ?', a: 'हो। कोठामा hover गर्दा × बटन देखिन्छ, वा Inspector panel मा Delete बटन हुन्छ।' },
        ],
    },
    {
        id: 'progress',
        icon: '📊',
        title: 'Progress — प्रगति हेर्ने',
        color: '#10b981',
        content: [
            { q: 'Progress tab मा के छ?', a: 'यहाँ प्रत्येक तल्लाको completion percentage, कुन कोठा सकियो, कुन बाँकी छ — सबै एकै ठाउँमा देखिन्छ।' },
            { q: 'Overall progress कसरी calculate हुन्छ?', a: 'सबै कोठामध्ये जति COMPLETED छन्, त्यसको percentage देखाइन्छ।' },
            { q: 'Budget यहाँ देखिन्छ?', a: 'हो — प्रत्येक तल्लाको total budget allocation र कोठा अनुसार breakdown यहाँ छ।' },
        ],
    },
    {
        id: 'tips',
        icon: '💡',
        title: 'Tips — सुझाव',
        color: '#f59e0b',
        content: [
            { q: 'कोठाको नाम दुई भाषामा राख्ने तरिका?', a: 'नाम "/" ले छुट्याउनुस् — जस्तै "Living Room / बैठककोठा"। System ले दुवै भाषा चिन्छ।' },
            { q: 'Zoom गर्ने shortcut के हो?', a: 'Mouse scroll गरेर zoom, Alt+drag गरेर pan गर्न सकिन्छ। "⌂" बटनले view reset हुन्छ।' },
            { q: 'Auto-save हुन्छ?', a: 'हो — Inspector panel मा कुनै पनि field बदल्दा 0.5 second पछि automatically save हुन्छ।' },
            { q: 'Grid snap के हो?', a: 'Rooms drag गर्दा 10cm को grid मा snap हुन्छ ताकि neat alignment होस्।' },
        ],
    },
];

export default function HelpPage() {
    const [open, setOpen] = useState({ overview: true });
    const toggle = (id) => setOpen(p => ({ ...p, [id]: !p[id] }));

    return (
        <div className="max-w-3xl mx-auto space-y-4 pb-10">
            <div className="mb-6">
                <h1 className="text-2xl font-black" style={{ color: 'var(--t-text)' }}>
                    📖 सहायता — Structure Module
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--t-text3)' }}>
                    घरको संरचना module कसरी प्रयोग गर्ने — सम्पूर्ण मार्गदर्शन
                </p>
            </div>

            {SECTIONS.map(sec => (
                <div
                    key={sec.id}
                    className="rounded-xl overflow-hidden"
                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
                >
                    <button
                        onClick={() => toggle(sec.id)}
                        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all"
                        style={{ borderLeft: `4px solid ${sec.color}` }}
                    >
                        <span className="text-2xl">{sec.icon}</span>
                        <span className="flex-1 font-bold" style={{ color: 'var(--t-text)' }}>{sec.title}</span>
                        <span className="text-xs" style={{ color: 'var(--t-text3)' }}>
                            {open[sec.id] ? '▲' : '▼'}
                        </span>
                    </button>

                    {open[sec.id] && (
                        <div className="px-5 pb-5 space-y-4">
                            {sec.content.map((item, i) => (
                                <div key={i} className="rounded-lg p-4" style={{ background: 'var(--t-bg)' }}>
                                    <p className="text-sm font-bold mb-1.5" style={{ color: sec.color }}>
                                        ❓ {item.q}
                                    </p>
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text)' }}>
                                        {item.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* Access table */}
            <div className="rounded-xl p-5" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                <h2 className="font-bold mb-4" style={{ color: 'var(--t-text)' }}>📍 URL Access Guide</h2>
                <table className="w-full text-xs">
                    <thead>
                        <tr style={{ color: 'var(--t-text3)' }}>
                            <th className="text-left py-1.5 font-semibold">Tab</th>
                            <th className="text-left py-1.5 font-semibold">URL</th>
                            <th className="text-left py-1.5 font-semibold">काम</th>
                        </tr>
                    </thead>
                    <tbody style={{ color: 'var(--t-text)' }}>
                        {[
                            ['Overview',    '/dashboard/desktop/structure',            'सारांश र तल्लाहरूको सूची'],
                            ['Floor Plan',  '/dashboard/desktop/structure/floorplan',  '2D नक्सा editor'],
                            ['Rooms',       '/dashboard/desktop/structure/rooms',       'कोठाहरूको list र edit'],
                            ['Progress',    '/dashboard/desktop/structure/progress',    'निर्माण प्रगति report'],
                            ['Help',        '/dashboard/desktop/structure/help',        'यो help page'],
                        ].map(([tab, url, desc]) => (
                            <tr key={tab} style={{ borderTop: '1px solid var(--t-border)' }}>
                                <td className="py-1.5 font-medium">{tab}</td>
                                <td className="py-1.5">
                                    <code className="px-1.5 py-0.5 rounded text-[10px]"
                                        style={{ background: 'var(--t-bg)', color: '#f97316' }}>
                                        {url}
                                    </code>
                                </td>
                                <td className="py-1.5" style={{ color: 'var(--t-text3)' }}>{desc}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
