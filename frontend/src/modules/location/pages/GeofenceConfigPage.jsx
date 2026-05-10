import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useLocationTracking } from '../context/LocationContext';
import locationApi from '../../../services/locationApi';

// ── Leaflet icon factory ──────────────────────────────────────────────────────
const makeColorIcon = (color = '#3b82f6', pulse = false) =>
    L.divIcon({
        className: '',
        html: `
            <div style="position:relative;width:36px;height:36px;">
                ${pulse ? `<div style="
                    position:absolute;inset:-6px;border-radius:50%;
                    background:${color};opacity:0.25;
                    animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
                "></div>` : ''}
                <div style="
                    position:absolute;inset:4px;
                    border-radius:50% 50% 50% 0;
                    background:${color};border:3px solid white;
                    box-shadow:0 2px 8px rgba(0,0,0,0.3);
                    transform:rotate(-45deg);
                "/>
            </div>
            <style>
                @keyframes ping {
                    75%,100%{transform:scale(1.8);opacity:0}
                }
            </style>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -38],
    });

// ── Map click handler ─────────────────────────────────────────────────────────
function ClickToPlace({ onPlace, active }) {
    const map = useMap();
    useEffect(() => {
        map.getContainer().style.cursor = active ? 'crosshair' : '';
    }, [active, map]);
    useMapEvents({ click(e) { if (active) onPlace(e.latlng); } });
    return null;
}

// ── Fly-to helper ─────────────────────────────────────────────────────────────
function FlyTo({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 17, { duration: 0.7 });
    }, [center, map]);
    return null;
}

const PRESET_COLORS = ['#3b82f6','#10b981','#ef4444','#f59e0b','#8b5cf6','#06b6d4','#f97316','#84cc16'];

const BLANK_FORM = {
    name: '',
    latitude: null,
    longitude: null,
    radius_meters: 100,
    fence_color: '#3b82f6',
    is_active: true,
};

// ── Steps indicator ───────────────────────────────────────────────────────────
function Steps({ current }) {
    const steps = ['Pick location', 'Name & radius', 'Save'];
    return (
        <div className="flex items-center gap-1 mb-4">
            {steps.map((label, i) => {
                const step = i + 1;
                const done = current > step;
                const active = current === step;
                return (
                    <React.Fragment key={label}>
                        <div className={`flex items-center gap-1.5 ${active ? 'opacity-100' : done ? 'opacity-60' : 'opacity-30'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 ${
                                done ? 'bg-emerald-500 border-emerald-500 text-white' :
                                active ? 'bg-indigo-600 border-indigo-600 text-white' :
                                'border-gray-300 text-gray-400'
                            }`}>
                                {done ? '✓' : step}
                            </div>
                            <span className={`text-xs font-bold ${active ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`flex-1 h-px mx-1 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default function GeofenceConfigPage({ projectId }) {
    const { geofences, loadGeofences } = useLocationTracking();
    const [form, setForm]               = useState(BLANK_FORM);
    const [editId, setEditId]           = useState(null);
    const [saving, setSaving]           = useState(false);
    const [deleting, setDeleting]       = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching]     = useState(false);
    const [flyCenter, setFlyCenter]     = useState(null);
    const [showOverlay, setShowOverlay] = useState(true); // "click map" hint

    const projectFences = useMemo(
        () => geofences.filter(g => g.project === parseInt(projectId)),
        [geofences, projectId],
    );

    const defaultCenter = useMemo(() => {
        if (projectFences.length > 0)
            return [parseFloat(projectFences[0].latitude), parseFloat(projectFences[0].longitude)];
        return [27.7172, 85.3240];
    }, [projectFences]);

    // Hide overlay once a position is chosen
    useEffect(() => {
        if (form.latitude != null) setShowOverlay(false);
    }, [form.latitude]);

    // Show overlay again when starting a new zone
    const startNew = () => {
        setEditId(null);
        setForm(BLANK_FORM);
        setShowOverlay(true);
    };

    const startEdit = (fence) => {
        setEditId(fence.id);
        setForm({
            name: fence.name,
            latitude: parseFloat(fence.latitude),
            longitude: parseFloat(fence.longitude),
            radius_meters: fence.radius_meters,
            fence_color: fence.fence_color || '#3b82f6',
            is_active: fence.is_active,
        });
        setFlyCenter([parseFloat(fence.latitude), parseFloat(fence.longitude)]);
        setShowOverlay(false);
    };

    const handleMapClick = (latlng) => {
        setForm(f => ({ ...f, latitude: latlng.lat, longitude: latlng.lng }));
        setFlyCenter([latlng.lat, latlng.lng]);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
            );
            const data = await res.json();
            if (data?.length > 0) {
                const pos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                setForm(f => ({ ...f, latitude: pos.lat, longitude: pos.lng }));
                setFlyCenter([pos.lat, pos.lng]);
            } else {
                alert('Location not found. Try a more specific search.');
            }
        } catch {
            alert('Search failed. Check your connection.');
        } finally {
            setSearching(false);
        }
    };

    const handleLocateMe = () => {
        if (!('geolocation' in navigator)) { alert('Geolocation not supported by your browser.'); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setForm(f => ({ ...f, latitude: p.lat, longitude: p.lng }));
                setFlyCenter([p.lat, p.lng]);
            },
            () => alert('Could not get your location. Please check browser permissions.'),
        );
    };

    // Determine which wizard step we're on
    const step = form.latitude == null ? 1 : !form.name.trim() ? 2 : 3;

    const handleSave = async () => {
        if (form.latitude == null || form.longitude == null) {
            alert('Please click on the map to set a location first.');
            setShowOverlay(true);
            return;
        }
        if (!form.name.trim()) {
            alert('Please enter a name for this zone.');
            return;
        }
        if (!projectId) {
            alert('No project selected. Please go back and select a project.');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                project: parseInt(projectId),
                name: form.name.trim(),
                latitude: form.latitude,
                longitude: form.longitude,
                radius_meters: parseInt(form.radius_meters),
                fence_color: form.fence_color,
                is_active: form.is_active,
            };
            if (editId) {
                await locationApi.updateGeofence(editId, payload);
            } else {
                await locationApi.createGeofence(payload);
            }
            await loadGeofences();
            startNew();
        } catch (err) {
            console.error('Save geofence error:', err?.response?.data || err);
            const msg = err?.response?.data
                ? JSON.stringify(err.response.data)
                : 'Failed to save geofence. Check the console for details.';
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this geofence zone? Staff inside will no longer be tracked.')) return;
        setDeleting(id);
        try {
            await locationApi.deleteGeofence(id);
            await loadGeofences();
            if (editId === id) startNew();
        } catch {
            alert('Failed to delete. Please try again.');
        } finally {
            setDeleting(null);
        }
    };

    const previewPosition = form.latitude != null ? [form.latitude, form.longitude] : null;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-black text-gray-900">Project Boundaries</h1>
                <p className="text-sm text-gray-500">
                    Define GPS zones — staff are automatically tracked when they enter these areas.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* ── Map ── */}
                <div className="xl:col-span-3 relative">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[520px] relative z-0">
                        <MapContainer
                            center={defaultCenter}
                            zoom={16}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            <ClickToPlace onPlace={handleMapClick} active={true} />
                            {flyCenter && <FlyTo center={flyCenter} />}

                            {/* Saved fences */}
                            {projectFences.map(fence => {
                                const isEditing = fence.id === editId;
                                const color = fence.fence_color || '#3b82f6';
                                return (
                                    <React.Fragment key={fence.id}>
                                        <Circle
                                            center={[parseFloat(fence.latitude), parseFloat(fence.longitude)]}
                                            pathOptions={{
                                                fillColor: color, color,
                                                fillOpacity: isEditing ? 0.18 : 0.07,
                                                weight: isEditing ? 2.5 : 1.5,
                                                dashArray: isEditing ? undefined : '6 4',
                                            }}
                                            radius={fence.radius_meters}
                                        />
                                        <Marker
                                            position={[parseFloat(fence.latitude), parseFloat(fence.longitude)]}
                                            icon={makeColorIcon(color, false)}
                                        />
                                    </React.Fragment>
                                );
                            })}

                            {/* Live preview of new/editing zone */}
                            {previewPosition && (
                                <>
                                    <Circle
                                        center={previewPosition}
                                        pathOptions={{
                                            fillColor: form.fence_color,
                                            color: form.fence_color,
                                            fillOpacity: 0.2,
                                            weight: 2.5,
                                        }}
                                        radius={parseInt(form.radius_meters) || 100}
                                    />
                                    <Marker
                                        position={previewPosition}
                                        icon={makeColorIcon(form.fence_color, true)}
                                    />
                                </>
                            )}
                        </MapContainer>

                        {/* "Click map" overlay — shown when no position set */}
                        {showOverlay && (
                            <div className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none">
                                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl px-8 py-6 text-center max-w-xs border border-indigo-100 pointer-events-auto">
                                    <div className="text-4xl mb-3">📍</div>
                                    <h3 className="text-lg font-black text-gray-900 mb-1">Click on the map</h3>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Tap anywhere on the map to drop the center of your site boundary
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={handleLocateMe}
                                            className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-sm"
                                        >
                                            🎯 Use My Current Location
                                        </button>
                                        <button
                                            onClick={() => setShowOverlay(false)}
                                            className="text-xs text-gray-400 hover:text-gray-600 py-1"
                                        >
                                            I'll click on the map manually
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right Panel ── */}
                <div className="xl:col-span-2 flex flex-col gap-4">
                    {/* Saved zones list */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-900 text-sm">
                                Saved Zones ({projectFences.length})
                            </h3>
                            <button
                                onClick={startNew}
                                className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                            >
                                + Add New
                            </button>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-40 overflow-y-auto">
                            {projectFences.length === 0 ? (
                                <p className="text-center text-gray-400 text-xs py-5">
                                    No zones yet — create your first one below
                                </p>
                            ) : projectFences.map(fence => (
                                <div
                                    key={fence.id}
                                    className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${
                                        fence.id === editId ? 'bg-indigo-50' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <span
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{ background: fence.fence_color || '#3b82f6' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{fence.name}</p>
                                        <p className="text-[10px] text-gray-400">{fence.radius_meters}m radius</p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button
                                            onClick={() => startEdit(fence)}
                                            className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg font-bold transition-colors"
                                        >Edit</button>
                                        <button
                                            onClick={() => handleDelete(fence.id)}
                                            disabled={deleting === fence.id}
                                            className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg font-bold transition-colors disabled:opacity-50"
                                        >{deleting === fence.id ? '…' : 'Del'}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add/Edit form */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex-1 space-y-4">
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm mb-3">
                                {editId ? '✏️ Edit Zone' : '➕ New Zone'}
                            </h3>
                            <Steps current={step} />
                        </div>

                        {/* Step 1 hint */}
                        {form.latitude == null ? (
                            <div
                                className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3 cursor-pointer"
                                onClick={() => setShowOverlay(true)}
                            >
                                <span className="text-xl">🗺️</span>
                                <div>
                                    <p className="text-sm font-bold text-indigo-700">Click on the map to begin</p>
                                    <p className="text-xs text-indigo-500">Or use the buttons on the map overlay</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Location confirmed */}
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                                    <span className="text-emerald-500 text-lg">✓</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-emerald-700">Location set</p>
                                        <p className="text-[10px] text-emerald-600 font-mono truncate">
                                            {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setForm(f => ({ ...f, latitude: null, longitude: null })); setShowOverlay(true); }}
                                        className="text-xs text-gray-400 hover:text-red-500 font-bold"
                                    >Change</button>
                                </div>

                                {/* Search */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">
                                        Or search a different address
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="e.g. Baneshwor, Kathmandu"
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                        />
                                        <button
                                            onClick={handleSearch}
                                            disabled={searching || !searchQuery.trim()}
                                            className="px-3 py-2 bg-gray-800 text-white font-bold rounded-xl text-sm hover:bg-gray-700 disabled:opacity-50"
                                        >{searching ? '…' : '🔍'}</button>
                                    </div>
                                </div>

                                {/* Zone Name */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">
                                        Zone Name *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Main Site, Material Store, Gate"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        autoFocus
                                    />
                                </div>

                                {/* Radius */}
                                <div>
                                    <div className="flex justify-between mb-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Radius</label>
                                        <span className="text-sm font-bold text-indigo-600">{form.radius_meters}m</span>
                                    </div>
                                    <input
                                        type="range" min="20" max="1000" step="10"
                                        className="w-full accent-indigo-500"
                                        value={form.radius_meters}
                                        onChange={e => setForm(f => ({ ...f, radius_meters: e.target.value }))}
                                    />
                                    <div className="flex justify-between text-[9px] text-gray-300 mt-0.5">
                                        <span>20m</span><span>500m</span><span>1km</span>
                                    </div>
                                </div>

                                {/* Color */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">
                                        Zone Color
                                    </label>
                                    <div className="flex gap-2 flex-wrap">
                                        {PRESET_COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setForm(f => ({ ...f, fence_color: c }))}
                                                className="w-7 h-7 rounded-full transition-transform hover:scale-110 border-2"
                                                style={{
                                                    background: c,
                                                    borderColor: form.fence_color === c ? '#1e293b' : 'transparent',
                                                    boxShadow: form.fence_color === c ? '0 0 0 2px white inset' : 'none',
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Save button */}
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm tracking-wide"
                                >
                                    {saving ? 'Saving…' : editId ? '💾 Update Zone' : '✅ Save Zone'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
