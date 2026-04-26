import React, { useState } from 'react';
import { useStructure } from '../context/StructureContext';
import FloorPlanCanvas from '../components/canvas/FloorPlanCanvas';
import Modal from '../../../components/common/Modal';
import FloorForm from '../components/floors/FloorForm';

const FLOOR_COLORS = ['#ea580c', '#3b82f6', '#8b5cf6', '#10b981'];

export default function FloorPlanPage() {
    const { floors, activeFloor, activeFloorId, setActiveFloorId, loading, reload } = useStructure();
    const [showFloorForm, setShowFloorForm] = useState(false);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
    );

    return (
        <div className="flex flex-col gap-4 h-full" style={{ minHeight: 600 }}>
            {/* Floor tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {floors.map((f, idx) => {
                    const color = FLOOR_COLORS[idx % FLOOR_COLORS.length];
                    const isActive = f.id === activeFloorId;
                    return (
                        <button
                            key={f.id}
                            onClick={() => setActiveFloorId(f.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                            style={{
                                background: isActive ? `${color}22` : 'var(--t-surface)',
                                border: `1.5px solid ${isActive ? color : 'var(--t-border)'}`,
                                color: isActive ? color : 'var(--t-text3)',
                            }}
                        >
                            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                            {f.name}
                            <span className="text-[10px]">({(f.rooms || []).length})</span>
                        </button>
                    );
                })}
                <button
                    onClick={() => setShowFloorForm(true)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold border transition-all"
                    style={{ color: '#ea580c', borderColor: '#ea580c', borderStyle: 'dashed', background: 'transparent' }}
                >
                    + Floor
                </button>
            </div>

            {/* Canvas */}
            {floors.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center rounded-xl py-20 text-center"
                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
                >
                    <div className="text-5xl mb-4">🏗️</div>
                    <h3 className="font-bold text-base mb-1" style={{ color: 'var(--t-text)' }}>No Floors Yet</h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--t-text3)' }}>
                        Add a floor to start drawing the plan
                    </p>
                    <button
                        onClick={() => setShowFloorForm(true)}
                        className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ background: '#ea580c' }}
                    >
                        + Add First Floor
                    </button>
                </div>
            ) : (
                <div className="flex-1" style={{ minHeight: 500 }}>
                    <FloorPlanCanvas floor={activeFloor} />
                </div>
            )}

            {/* Hint */}
            <p className="text-[10px] text-center" style={{ color: 'var(--t-text3)' }}>
                🖱️ Drag rooms to reposition · Scroll to zoom · Click room to inspect · Alt+drag to pan
            </p>

            {showFloorForm && (
                <Modal onClose={() => { setShowFloorForm(false); reload(); }}>
                    <FloorForm onClose={() => setShowFloorForm(false)} />
                </Modal>
            )}
        </div>
    );
}
