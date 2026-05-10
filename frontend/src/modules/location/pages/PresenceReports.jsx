import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocationTracking } from '../context/LocationContext';
import locationApi from '../../../services/locationApi';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (mins) => {
    if (!mins) return '0m';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};
const fmtTime = (dt) =>
    dt ? new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

// ── Path Playback Modal ───────────────────────────────────────────────────────
function PathPlaybackModal({ session, date, onClose }) {
    const [history, setHistory]   = useState([]);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        if (!session) return;
        locationApi
            .getLocationHistory({ user: session.user, date, project: session.project })
            .then(data => setHistory(Array.isArray(data) ? data : []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [session, date]);

    if (!session) return null;

    const coords = history
        .filter(p => p.latitude != null && p.longitude != null)
        .map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]);

    const center = coords.length > 0 ? coords[0] : [27.7172, 85.3240];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">
                            🛤 Path Playback — {session.full_name}
                        </h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {date} · {history.length} GPS pings recorded
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors text-xl font-bold"
                    >
                        ×
                    </button>
                </div>

                <div className="h-[400px] relative z-0">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            Loading GPS history…
                        </div>
                    ) : coords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                            <div className="text-4xl">📡</div>
                            <p className="font-medium">No GPS pings with position data found</p>
                            <p className="text-sm text-gray-300">The device may not have sent coordinates</p>
                        </div>
                    ) : (
                        <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />
                            {/* Path line */}
                            <Polyline
                                positions={coords}
                                pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.7 }}
                            />
                            {/* Start point */}
                            <CircleMarker
                                center={coords[0]}
                                radius={8}
                                pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 1 }}
                            >
                                <Popup>Start — {fmtTime(history[0]?.timestamp)}</Popup>
                            </CircleMarker>
                            {/* End point */}
                            {coords.length > 1 && (
                                <CircleMarker
                                    center={coords[coords.length - 1]}
                                    radius={8}
                                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }}
                                >
                                    <Popup>End — {fmtTime(history[history.length - 1]?.timestamp)}</Popup>
                                </CircleMarker>
                            )}
                            {/* Intermediate pings */}
                            {coords.slice(1, -1).map((pt, i) => (
                                <CircleMarker
                                    key={i}
                                    center={pt}
                                    radius={4}
                                    pathOptions={{ color: '#3b82f6', fillColor: '#bfdbfe', fillOpacity: 0.8 }}
                                >
                                    <Popup>
                                        <div className="text-xs">
                                            <div className="font-bold">{fmtTime(history[i + 1]?.timestamp)}</div>
                                            {history[i + 1]?.speed != null && (
                                                <div>{(history[i + 1].speed * 3.6).toFixed(1)} km/h</div>
                                            )}
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            ))}
                        </MapContainer>
                    )}
                </div>

                {/* Stats footer */}
                {!loading && coords.length > 0 && (
                    <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
                        {[
                            { label: 'Pings', value: history.length },
                            { label: 'Time In', value: fmtTime(history[0]?.timestamp) },
                            { label: 'Time Out', value: fmtTime(history[history.length - 1]?.timestamp) },
                        ].map(({ label, value }) => (
                            <div key={label} className="p-3 text-center">
                                <div className="text-lg font-black text-gray-900">{value}</div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PresenceReports({ projectId }) {
    const { analytics, loadAnalytics, loading } = useLocationTracking();
    const [date, setDate]             = useState(new Date().toISOString().split('T')[0]);
    const [summary, setSummary]       = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [playback, setPlayback]     = useState(null);   // session to replay

    useEffect(() => {
        if (projectId) loadAnalytics(date);
    }, [projectId, date, loadAnalytics]);

    useEffect(() => {
        if (!projectId) return;
        setSummaryLoading(true);
        locationApi
            .getPresenceSummary({ project: projectId, date })
            .then(setSummary)
            .catch(console.error)
            .finally(() => setSummaryLoading(false));
    }, [projectId, date]);

    const statCards = [
        { label: 'Total Sessions', value: summary?.total_sessions ?? '—', icon: '📋', color: 'bg-blue-50 text-blue-700' },
        { label: 'Currently On-Site', value: summary?.active_count ?? '—', icon: '🟢', color: 'bg-emerald-50 text-emerald-700' },
        { label: 'Unique Workers', value: summary?.unique_workers ?? '—', icon: '👷', color: 'bg-indigo-50 text-indigo-700' },
        { label: 'Total Hours', value: summary ? `${Math.floor((summary.total_minutes || 0) / 60)}h ${(summary.total_minutes || 0) % 60}m` : '—', icon: '⏱', color: 'bg-amber-50 text-amber-700' },
    ];

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Presence Reports</h1>
                    <p className="text-sm text-gray-500">Staff time-on-site analytics and path playback</p>
                </div>
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold shadow-sm"
                />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(c => (
                    <div key={c.label} className={`rounded-2xl p-4 ${c.color} border border-transparent`}>
                        <div className="text-2xl font-black">
                            {summaryLoading ? <span className="text-gray-300 animate-pulse">—</span> : c.value}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wide mt-0.5 opacity-80">{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Per-worker bar chart (simple CSS bars) */}
            {summary?.workers?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-bold text-gray-900 mb-4">Time On-Site by Worker</h3>
                    <div className="space-y-3">
                        {summary.workers.map(w => {
                            const maxMins = Math.max(...summary.workers.map(x => x.total_minutes || 0), 1);
                            const pct = ((w.total_minutes || 0) / maxMins) * 100;
                            return (
                                <div key={w.user_id} className="flex items-center gap-3">
                                    <div className="w-28 text-sm font-bold text-gray-700 truncate shrink-0">
                                        {w.full_name}
                                    </div>
                                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="w-16 text-right text-sm font-bold text-gray-500 shrink-0">
                                        {fmt(w.total_minutes)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Sessions table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Session Log</h3>
                    <span className="text-xs text-gray-400">{analytics.length} sessions</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-6 py-3 font-bold">Staff Member</th>
                                <th className="px-6 py-3 font-bold">Arrived</th>
                                <th className="px-6 py-3 font-bold">Left</th>
                                <th className="px-6 py-3 font-bold">Duration</th>
                                <th className="px-6 py-3 font-bold">Status</th>
                                <th className="px-6 py-3 font-bold">Path</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400">
                                        <div className="animate-pulse">Loading sessions…</div>
                                    </td>
                                </tr>
                            ) : analytics.length > 0 ? analytics.map(session => (
                                <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2.5">
                                            <img
                                                src={session.avatar_url}
                                                alt={session.full_name}
                                                className="w-8 h-8 rounded-full shrink-0"
                                            />
                                            <div>
                                                <div className="font-bold text-gray-900">{session.full_name}</div>
                                                <div className="text-[10px] text-gray-400">@{session.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-medium">
                                        {fmtTime(session.entry_at)}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-medium">
                                        {session.is_active ? '—' : fmtTime(session.exit_at)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {session.is_active ? (
                                            <span className="text-emerald-500 font-bold text-xs">Tracking…</span>
                                        ) : (
                                            <span className="font-bold text-gray-700">{fmt(session.duration_minutes)}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {session.is_active ? (
                                            <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase">
                                                On-Site
                                            </span>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase">
                                                Completed
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => setPlayback(session)}
                                            className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors border border-indigo-100"
                                        >
                                            🛤 Replay
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center">
                                        <div className="text-3xl mb-2">📅</div>
                                        <p className="text-gray-400 font-medium">No presence records for {date}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Path Playback Modal */}
            {playback && (
                <PathPlaybackModal
                    session={playback}
                    date={date}
                    onClose={() => setPlayback(null)}
                />
            )}
        </div>
    );
}
