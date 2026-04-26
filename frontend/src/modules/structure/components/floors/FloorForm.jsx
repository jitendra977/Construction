import React, { useState } from 'react';
import structureApi from '../../services/structureApi';
import { useStructure } from '../../context/StructureContext';

const FIELD = 'w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors';
const STYLE = {
    background: 'var(--t-surface)',
    border: '1px solid var(--t-border)',
    color: 'var(--t-text)',
};

export default function FloorForm({ onClose, editFloor = null }) {
    const { projectId, addFloorLocal, updateFloorLocal } = useStructure();
    const isEdit = !!editFloor;

    const [form, setForm] = useState({
        name:          editFloor?.name          || '',
        level:         editFloor?.level         ?? '',
        plan_width_cm: editFloor?.plan_width_cm  || '',
        plan_depth_cm: editFloor?.plan_depth_cm  || '',
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr]       = useState('');

    const change = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setErr('Floor name is required.'); return; }
        setSaving(true); setErr('');
        try {
            const payload = {
                name:          form.name.trim(),
                level:         form.level !== '' ? +form.level : 0,
                plan_width_cm: form.plan_width_cm !== '' ? +form.plan_width_cm : null,
                plan_depth_cm: form.plan_depth_cm !== '' ? +form.plan_depth_cm : null,
                project:       projectId,
            };
            if (isEdit) {
                const res = await structureApi.updateFloor(editFloor.id, payload);
                updateFloorLocal(editFloor.id, res.data);
            } else {
                const res = await structureApi.createFloor(payload);
                addFloorLocal(res.data);
            }
            onClose();
        } catch (e) {
            console.error(e);
            setErr('Save failed. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="p-5 space-y-4">
            <h2 className="text-base font-bold" style={{ color: 'var(--t-text)' }}>
                {isEdit ? 'Edit Floor' : 'Add New Floor'}
            </h2>

            {err && (
                <div className="px-3 py-2 rounded-lg text-sm text-red-600 bg-red-50 border border-red-200">{err}</div>
            )}

            <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--t-text3)' }}>
                    Floor Name *
                </label>
                <input
                    className={FIELD}
                    style={STYLE}
                    value={form.name}
                    onChange={e => change('name', e.target.value)}
                    placeholder="e.g. Ground Floor / भूतल"
                />
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--t-text3)' }}>Level</label>
                    <input
                        type="number"
                        className={FIELD}
                        style={STYLE}
                        value={form.level}
                        onChange={e => change('level', e.target.value)}
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--t-text3)' }}>Width (cm)</label>
                    <input
                        type="number"
                        className={FIELD}
                        style={STYLE}
                        value={form.plan_width_cm}
                        onChange={e => change('plan_width_cm', e.target.value)}
                        placeholder="1500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--t-text3)' }}>Depth (cm)</label>
                    <input
                        type="number"
                        className={FIELD}
                        style={STYLE}
                        value={form.plan_depth_cm}
                        onChange={e => change('plan_depth_cm', e.target.value)}
                        placeholder="1000"
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                    style={{ color: 'var(--t-text3)', borderColor: 'var(--t-border)' }}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ background: saving ? '#9ca3af' : '#ea580c' }}
                >
                    {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Floor'}
                </button>
            </div>
        </form>
    );
}
