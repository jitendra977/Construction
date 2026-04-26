import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import structureApi from '../services/structureApi';

const StructureContext = createContext(null);

export function StructureProvider({ projectId, children }) {
    const [floors, setFloors]           = useState([]);
    const [activeFloorId, setActiveFloorId] = useState(null);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState(null);

    // ── load floors ──────────────────────────────────────────────────────────
    const loadFloors = useCallback(async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            setError(null);
            const res = await structureApi.getFloors(projectId);
            const data = res.data?.results ?? res.data ?? [];
            setFloors(data);
            if (data.length && !activeFloorId) setActiveFloorId(data[0].id);
        } catch (e) {
            console.error('Failed to load floors', e);
            setError('Could not load floors.');
        } finally {
            setLoading(false);
        }
    }, [projectId, activeFloorId]);

    useEffect(() => { loadFloors(); }, [projectId]);

    // ── derived ─────────────────────────────────────────────────────────────
    const activeFloor = floors.find(f => f.id === activeFloorId) || floors[0] || null;
    const allRooms    = floors.flatMap(f => f.rooms || []);

    // stats
    const totalRooms     = allRooms.length;
    const completedRooms = allRooms.filter(r => r.status === 'COMPLETED').length;
    const inProgressRooms = allRooms.filter(r => r.status === 'IN_PROGRESS').length;
    const totalArea      = allRooms.reduce((s, r) => s + (+r.area_sqft || 0), 0);
    const totalBudget    = allRooms.reduce((s, r) => s + (+r.budget_allocation || 0), 0);

    // ── room mutations ───────────────────────────────────────────────────────
    const updateRoomLocal = useCallback((roomId, patch) => {
        setFloors(prev => prev.map(f => ({
            ...f,
            rooms: (f.rooms || []).map(r => r.id === roomId ? { ...r, ...patch } : r),
        })));
    }, []);

    const addRoomLocal = useCallback((room) => {
        setFloors(prev => prev.map(f =>
            f.id === room.floor ? { ...f, rooms: [...(f.rooms || []), room] } : f
        ));
    }, []);

    const removeRoomLocal = useCallback((roomId) => {
        setFloors(prev => prev.map(f => ({
            ...f,
            rooms: (f.rooms || []).filter(r => r.id !== roomId),
        })));
    }, []);

    // ── floor mutations ──────────────────────────────────────────────────────
    const addFloorLocal = useCallback((floor) => {
        setFloors(prev => [...prev, { ...floor, rooms: [] }]);
        setActiveFloorId(floor.id);
    }, []);

    const updateFloorLocal = useCallback((floorId, patch) => {
        setFloors(prev => prev.map(f => f.id === floorId ? { ...f, ...patch } : f));
    }, []);

    const removeFloorLocal = useCallback((floorId) => {
        setFloors(prev => {
            const next = prev.filter(f => f.id !== floorId);
            if (activeFloorId === floorId && next.length) setActiveFloorId(next[0].id);
            return next;
        });
    }, [activeFloorId]);

    return (
        <StructureContext.Provider value={{
            floors,
            activeFloor,
            activeFloorId,
            setActiveFloorId,
            allRooms,
            loading,
            error,
            reload: loadFloors,
            stats: { totalRooms, completedRooms, inProgressRooms, totalArea, totalBudget },
            // mutations
            updateRoomLocal,
            addRoomLocal,
            removeRoomLocal,
            addFloorLocal,
            updateFloorLocal,
            removeFloorLocal,
            projectId,
        }}>
            {children}
        </StructureContext.Provider>
    );
}

export const useStructure = () => {
    const ctx = useContext(StructureContext);
    if (!ctx) throw new Error('useStructure must be used inside <StructureProvider>');
    return ctx;
};
