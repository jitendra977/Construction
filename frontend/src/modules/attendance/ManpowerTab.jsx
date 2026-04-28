/**
 * ManpowerTab.jsx — Real-world unified Person record
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE form to add a person. ONE card per real human.
 * Three roles shown as toggleable badges on each card:
 *   📋 Attendance  — QR scan, daily records
 *   💰 Payment     — contractor expenses, balance
 *   🔐 Login       — user account access
 *
 * Real-world rule: Ram Mistri exists ONCE in this system.
 * You choose which roles apply to him.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { attendanceService } from '../../services/attendanceService';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRADE_OPTIONS = [
  { value:'MASON',       label:'Mason (Dakarmi)' },
  { value:'HELPER',      label:'Helper (Jugi)' },
  { value:'CARPENTER',   label:'Carpenter (Mistri)' },
  { value:'ELECTRICIAN', label:'Electrician' },
  { value:'PLUMBER',     label:'Plumber' },
  { value:'PAINTER',     label:'Painter' },
  { value:'STEEL_FIXER', label:'Steel Fixer (Lohari)' },
  { value:'SUPERVISOR',  label:'Site Supervisor' },
  { value:'TILE_SETTER', label:'Tile Setter' },
  { value:'EXCAVATOR',   label:'Excavator Operator' },
  { value:'WATERPROOF',  label:'Waterproofing' },
  { value:'DRIVER',      label:'Driver' },
  { value:'SECURITY',    label:'Security Guard' },
  { value:'ENGINEER',    label:'Engineer' },
  { value:'ACCOUNTANT',  label:'Accountant' },
  { value:'MANAGER',     label:'Project Manager' },
  { value:'OTHER',       label:'Other' },
];

const CONTRACTOR_ROLE_OPTIONS = [
  { value:'LABOUR',      label:'Labour (Helper)' },
  { value:'MISTRI',      label:'Mistri (Mason)' },
  { value:'THEKEDAAR',   label:'Thekedaar (Contractor)' },
  { value:'CARPENTER',   label:'Carpenter' },
  { value:'ELECTRICIAN', label:'Electrician' },
  { value:'PLUMBER',     label:'Plumber' },
  { value:'PAINTER',     label:'Painter' },
  { value:'TILE_MISTRI', label:'Tile Mistri' },
  { value:'ENGINEER',    label:'Civil Engineer' },
  { value:'WELDER',      label:'Welder' },
  { value:'OTHER',       label:'Other' },
];

const TODAY_COLOR = {
  PRESENT:    '#22c55e',
  HALF_DAY:   '#f59e0b',
  ABSENT:     '#ef4444',
  LEAVE:      '#6366f1',
  HOLIDAY:    '#06b6d4',
  NOT_MARKED: '#d1d5db',
};

// ─── Tiny utils ────────────────────────────────────────────────────────────────

function Avatar({ name, size = 38 }) {
  const initials = (name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const hue = [...(name || 'X')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},52%,46%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
      userSelect: 'none',
    }}>{initials}</div>
  );
}

function RoleBadge({ icon, label, enabled, small = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: small ? '2px 7px' : '3px 9px',
      borderRadius: 99, fontSize: small ? 10 : 11, fontWeight: 600,
      background: enabled ? undefined : '#f1f5f9',
      color: enabled ? '#fff' : '#94a3b8',
      backgroundColor: enabled ? (
        icon === '📋' ? '#22c55e' : icon === '💰' ? '#f59e0b' : '#6366f1'
      ) : '#f1f5f9',
      border: `1px solid ${enabled ? 'transparent' : '#e2e8f0'}`,
    }}>
      {icon} {label}
    </span>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11, flexShrink: 0,
        background: value ? '#22c55e' : '#d1d5db',
        position: 'relative', cursor: 'pointer',
        transition: 'background .18s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </div>
  );
}

// ─── Summary banner ────────────────────────────────────────────────────────────

function SummaryBanner({ summary }) {
  const stats = [
    { label: 'Total',       value: summary.total,            icon: '👷', color: '#6366f1' },
    { label: 'Attendance',  value: summary.active,           icon: '📋', color: '#22c55e' },
    { label: 'Payment',     value: summary.with_payment,     icon: '💰', color: '#f59e0b' },
    { label: 'Login',       value: summary.with_login,       icon: '🔐', color: '#8b5cf6' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: '#fff', borderRadius: 10, padding: '10px 6px',
          textAlign: 'center', border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Person card ──────────────────────────────────────────────────────────────

function PersonCard({ person, onToggleRole, onEdit, toggling }) {
  const [expanded, setExpanded] = useState(false);

  const todayDot  = TODAY_COLOR[person.today_status] || TODAY_COLOR.NOT_MARKED;
  const todayText = person.today_check_in
    ? `In ${person.today_check_in}${person.today_check_out ? ' · Out ' + person.today_check_out : ''}`
    : person.today_status === 'NOT_MARKED' ? 'Not marked' : person.today_status;

  const outOfSync = person.role_payment && !person.in_sync;

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      overflow: 'hidden',
    }}>
      {/* ── Card header (always visible) ── */}
      <div
        style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <Avatar name={person.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>{person.name}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{person.trade_label}</span>
            <span>·</span>
            <span>₹{Number(person.daily_rate).toLocaleString()}/day</span>
          </div>
          {/* Today badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: todayDot }} />
            <span style={{ fontSize: 11, color: '#6b7280' }}>{todayText}</span>
          </div>
        </div>
        {/* Role pills */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <RoleBadge icon="📋" label="QR"      enabled={person.role_attendance} small />
          <RoleBadge icon="💰" label="Pay"     enabled={person.role_payment}    small />
          <RoleBadge icon="🔐" label="Login"   enabled={person.role_login}      small />
        </div>
        <span style={{ fontSize: 11, color: '#d1d5db', marginLeft: 2 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Out-of-sync warning */}
          {outOfSync && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: 8, padding: '7px 10px',
              fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ⚠️ Payment record has different name/phone/rate. Tap Sync to fix.
            </div>
          )}

          {/* Phone / joined */}
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
            {person.phone && <span>📞 {person.phone}</span>}
            {person.joined_date && <span>📅 Joined {person.joined_date}</span>}
          </div>

          {/* Payment info if enabled */}
          {person.role_payment && (
            <div style={{
              background: '#fffbeb', borderRadius: 8, padding: '8px 10px',
              display: 'flex', gap: 16, flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: '#92400e', fontWeight: 600 }}>Payment Track:</span>
                <span style={{ color: '#374151', marginLeft: 4 }}>{person.contractor_role_label}</span>
              </div>
              {person.total_paid != null && (
                <div style={{ fontSize: 12 }}>
                  Paid: <strong>₹{Number(person.total_paid).toLocaleString()}</strong>
                </div>
              )}
              {person.balance_due != null && (
                <div style={{ fontSize: 12, color: person.balance_due > 0 ? '#dc2626' : '#16a34a' }}>
                  Balance: <strong>₹{Number(person.balance_due).toLocaleString()}</strong>
                </div>
              )}
            </div>
          )}

          {/* Login info if enabled */}
          {person.role_login && (
            <div style={{
              background: '#f5f3ff', borderRadius: 8, padding: '8px 10px',
              fontSize: 12, color: '#5b21b6',
            }}>
              🔐 {person.user_name} · {person.user_email}
            </div>
          )}

          {/* Role toggles */}
          <div style={{
            background: '#f8fafc', borderRadius: 8, padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>ROLES</div>

            {/* Payment toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>💰 Payment Tracking</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {person.role_payment ? `Contractor ID #${person.contractor_id}` : 'Off — no expense records'}
                </div>
              </div>
              <Toggle
                value={person.role_payment}
                onChange={v => onToggleRole(person.worker_id, 'payment', v)}
              />
            </div>

            {/* Login toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>🔐 Login Access</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {person.role_login ? `@${person.user_name}` : 'Off — no app login'}
                </div>
              </div>
              <Toggle
                value={person.role_login}
                onChange={v => onToggleRole(person.worker_id, 'login', v)}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onEdit(person)}
              style={{
                flex: 1, padding: '8px', borderRadius: 8,
                background: '#f1f5f9', border: '1px solid #e2e8f0',
                color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >✏️ Edit</button>
            {outOfSync && (
              <button
                onClick={() => attendanceService.syncFromContractor(person.worker_id).catch(console.error)}
                disabled={toggling}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8,
                  background: '#fffbeb', border: '1px solid #fde68a',
                  color: '#92400e', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >🔄 Sync</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Orphan contractor card ────────────────────────────────────────────────────

function OrphanCard({ c, onAdopt, adopting }) {
  const TRADE_MAP = {
    LABOUR:'HELPER', MISTRI:'MASON', THEKEDAAR:'SUPERVISOR',
    CARPENTER:'CARPENTER', ELECTRICIAN:'ELECTRICIAN', PLUMBER:'PLUMBER',
    PAINTER:'PAINTER', TILE_MISTRI:'TILE_SETTER', ENGINEER:'ENGINEER',
    WELDER:'STEEL_FIXER', OTHER:'OTHER',
  };
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px dashed #fca5a5',
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <Avatar name={c.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1f2937' }}>{c.name}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
          {c.role_label} {c.daily_wage ? `· ₹${Number(c.daily_wage).toLocaleString()}/day` : ''}
        </div>
        <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>
          💰 Payment record only — not tracked for attendance yet
        </div>
      </div>
      <button
        onClick={() => onAdopt(c, TRADE_MAP[c.role] || 'OTHER')}
        disabled={adopting === c.contractor_id}
        style={{
          padding: '7px 12px', borderRadius: 8, border: 'none',
          background: adopting === c.contractor_id ? '#f3f4f6' : '#22c55e',
          color: adopting === c.contractor_id ? '#9ca3af' : '#fff',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {adopting === c.contractor_id ? '⏳…' : '➕ Track'}
      </button>
    </div>
  );
}

// ─── Add Person bottom-sheet ──────────────────────────────────────────────────

function AddPersonSheet({ projectId, onClose, onAdded }) {
  const [form, setForm] = useState({
    name:            '',
    trade:           'MASON',
    contractor_role: 'LABOUR',
    worker_type:     'LABOUR',
    phone:           '',
    daily_rate:      '',
    notes:           '',
    joined_date:     '',
    role_attendance: true,
    role_payment:    false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const nameRef = useRef(null);

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 200); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    if (!form.role_attendance && !form.role_payment) {
      setErr('Enable at least one role.'); return;
    }
    setSaving(true); setErr('');
    try {
      await attendanceService.addPerson({
        project:          projectId,
        name:             form.name.trim(),
        trade:            form.trade,
        contractor_role:  form.contractor_role,
        worker_type:      form.worker_type,
        phone:            form.phone,
        daily_rate:       form.daily_rate || 0,
        notes:            form.notes,
        joined_date:      form.joined_date || null,
        role_attendance:  form.role_attendance,
        role_payment:     form.role_payment,
      });
      onAdded();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.error || JSON.stringify(e?.response?.data) || 'Failed to add person.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box',
    background: '#fafafa', outline: 'none',
  };
  const labelStyle = { fontSize: 11, color: '#6b7280', fontWeight: 700, display: 'block', marginBottom: 4 };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 600, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d1d5db' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '12px 20px 16px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#1f2937' }}>👷 Add Person</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            Enter once — choose which roles apply
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input
              ref={nameRef}
              style={inputStyle}
              placeholder="e.g. Ram Bahadur Tamang"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          {/* Trade + Type */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Trade (Attendance)</label>
              <select style={inputStyle} value={form.trade} onChange={e => set('trade', e.target.value)}>
                {TRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Worker Type</label>
              <select style={inputStyle} value={form.worker_type} onChange={e => set('worker_type', e.target.value)}>
                <option value="LABOUR">Daily Labour</option>
                <option value="STAFF">Salaried Staff</option>
              </select>
            </div>
          </div>

          {/* Phone + Rate */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} placeholder="98XXXXXXXX" type="tel"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Daily Rate (NPR)</label>
              <input style={inputStyle} placeholder="800" type="number"
                value={form.daily_rate} onChange={e => set('daily_rate', e.target.value)} />
            </div>
          </div>

          {/* ── Role toggles ── */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>ENABLE ROLES</div>

            {/* Attendance role */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle value={form.role_attendance} onChange={v => set('role_attendance', v)} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>📋 Attendance Tracking</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>QR code · daily mark · scan logs</div>
              </div>
            </div>

            {/* Payment role */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle value={form.role_payment} onChange={v => set('role_payment', v)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>💰 Payment Tracking</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Contractor record · expenses · balance</div>
              </div>
            </div>

            {/* Contractor role type (only when payment on) */}
            {form.role_payment && (
              <div style={{ marginLeft: 52 }}>
                <label style={{ ...labelStyle, marginBottom: 4 }}>Contractor Role</label>
                <select
                  style={{ ...inputStyle, background: '#fff' }}
                  value={form.contractor_role}
                  onChange={e => set('contractor_role', e.target.value)}
                >
                  {CONTRACTOR_ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Optional fields */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Joined Date</label>
              <input style={inputStyle} type="date"
                value={form.joined_date} onChange={e => set('joined_date', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Notes</label>
              <input style={inputStyle} placeholder="Optional"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {err && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626',
            }}>{err}</div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none',
              background: saving || !form.name.trim() ? '#e5e7eb' : '#6366f1',
              color: saving || !form.name.trim() ? '#9ca3af' : '#fff',
              fontSize: 15, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {saving ? '⏳ Adding…' : '✅ Add Person'}
          </button>

          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}

// ─── Edit Person bottom-sheet ──────────────────────────────────────────────────

function EditPersonSheet({ person, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:       person.name,
    trade:      person.trade,
    phone:      person.phone,
    daily_rate: person.daily_rate,
    notes:      person.notes || '',
    is_active:  person.is_active,
    joined_date: person.joined_date || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box',
    background: '#fafafa',
  };
  const labelStyle = { fontSize: 11, color: '#6b7280', fontWeight: 700, display: 'block', marginBottom: 4 };

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      await attendanceService.updatePerson(person.worker_id, form);
      onSaved();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to save.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 600, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d1d5db' }} />
        </div>
        <div style={{ padding: '12px 20px 14px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#1f2937' }}>✏️ Edit — {person.name}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Trade</label>
              <select style={inputStyle} value={form.trade} onChange={e => set('trade', e.target.value)}>
                {TRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Daily Rate</label>
              <input style={inputStyle} type="number" value={form.daily_rate} onChange={e => set('daily_rate', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <input style={inputStyle} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Active on site</span>
            <Toggle value={form.is_active} onChange={v => set('is_active', v)} />
          </div>
          {err && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626' }}>{err}</div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: 13, borderRadius: 12, border: 'none',
              background: saving ? '#e5e7eb' : '#6366f1',
              color: saving ? '#9ca3af' : '#fff',
              fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >{saving ? '⏳ Saving…' : '💾 Save Changes'}</button>
          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}

// ─── Toggle Role confirm sheet ─────────────────────────────────────────────────

function ToggleRoleSheet({ workerId, role, enable, personName, onClose, onDone }) {
  const [form, setForm] = useState({ email: '', contractor_role: 'LABOUR' });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const needsEmail = role === 'login' && enable;
  const isDisable  = !enable;

  const handleConfirm = async () => {
    setSaving(true); setErr('');
    try {
      const payload = { role, enable };
      if (needsEmail) payload.email = form.email;
      if (role === 'payment' && enable) payload.contractor_role = form.contractor_role;
      await attendanceService.toggleRole(workerId, payload);
      onDone();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed.');
    } finally { setSaving(false); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 400,
        display: 'flex', flexDirection: 'column', gap: 14,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#1f2937' }}>
          {enable ? '✅ Enable' : '❌ Disable'} {role === 'payment' ? '💰 Payment' : '🔐 Login'} role
        </div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          {isDisable
            ? `Remove the ${role} role from ${personName}? Their records are kept.`
            : role === 'payment'
            ? `Create a contractor payment record for ${personName}.`
            : `Create a login account for ${personName}.`
          }
        </div>
        {role === 'payment' && enable && (
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, display: 'block', marginBottom: 4 }}>Contractor Role</label>
            <select style={inputStyle} value={form.contractor_role} onChange={e => setForm(f => ({ ...f, contractor_role: e.target.value }))}>
              {CONTRACTOR_ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
        {needsEmail && (
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, display: 'block', marginBottom: 4 }}>Email for login *</label>
            <input
              style={inputStyle} type="email" placeholder="person@example.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoFocus
            />
          </div>
        )}
        {err && <div style={{ background: '#fef2f2', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626' }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || (needsEmail && !form.email)}
            style={{
              flex: 2, padding: 11, borderRadius: 10, border: 'none',
              background: saving ? '#e5e7eb' : (enable ? '#6366f1' : '#ef4444'),
              color: saving ? '#9ca3af' : '#fff',
              fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >{saving ? '⏳…' : enable ? 'Enable' : 'Disable'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ManpowerTab({ projectId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Sheets
  const [showAdd, setShowAdd]           = useState(false);
  const [editPerson, setEditPerson]     = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null); // {workerId, role, enable, personName}
  const [adopting, setAdopting]         = useState(null); // contractorId

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true); setError(null);
    attendanceService.getPersons(projectId, showInactive ? 'all' : 'true')
      .then(setData)
      .catch(e => setError(e?.response?.data?.error || 'Failed to load.'))
      .finally(() => setLoading(false));
  }, [projectId, showInactive]);

  useEffect(() => { load(); }, [load]);

  const handleToggleRole = (workerId, role, enable) => {
    const p = data?.persons.find(p => p.worker_id === workerId);
    setToggleTarget({ workerId, role, enable, personName: p?.name || '' });
  };

  const handleAdopt = async (contractor, trade) => {
    setAdopting(contractor.contractor_id);
    try {
      await attendanceService.adoptContractor({ contractor_id: contractor.contractor_id, trade });
      load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to add worker.');
    } finally { setAdopting(null); }
  };

  const filter = search.trim().toLowerCase();
  const persons = (data?.persons || []).filter(p =>
    !filter || p.name.toLowerCase().includes(filter) || (p.trade_label || '').toLowerCase().includes(filter)
  );
  const orphans = (data?.orphan_contractors || []).filter(c =>
    !filter || c.name.toLowerCase().includes(filter)
  );
  const summary = data?.summary || { total: 0, active: 0, with_payment: 0, with_login: 0, orphan_contractors: 0 };

  if (!projectId) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
      Select a project to view manpower.
    </div>
  );

  return (
    <div style={{ padding: '0 0 100px', maxWidth: 660, margin: '0 auto' }}>

      {/* Title bar */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1f2937' }}>👷 People</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>One record per person · Toggle roles per person</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          padding: '9px 16px', borderRadius: 10, border: 'none',
          background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>➕ Add Person</button>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {/* Summary */}
        {data && <SummaryBanner summary={summary} />}

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              border: '1px solid #e5e7eb', fontSize: 14, background: '#f9fafb',
            }}
            placeholder="🔍  Search name or trade…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            onClick={() => setShowInactive(s => !s)}
            style={{
              padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb',
              background: showInactive ? '#fef3c7' : '#fff',
              color: showInactive ? '#92400e' : '#6b7280',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >{showInactive ? '👁 All' : '👁 Active'}</button>
          <button onClick={load} style={{
            padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb',
            background: '#fff', color: '#6b7280', fontSize: 13, cursor: 'pointer',
          }}>🔄</button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 50, color: '#9ca3af' }}>
            <div style={{ fontSize: 28 }}>⏳</div>
            <div style={{ marginTop: 8 }}>Loading people…</div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ color: '#ef4444', marginBottom: 10 }}>{error}</div>
            <button onClick={load} style={{ padding: '8px 18px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}>Retry</button>
          </div>
        )}

        {/* Persons list */}
        {!loading && !error && (
          <>
            {persons.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {persons.map(p => (
                  <PersonCard
                    key={p.worker_id}
                    person={p}
                    onToggleRole={handleToggleRole}
                    onEdit={setEditPerson}
                    toggling={false}
                  />
                ))}
              </div>
            )}

            {/* Orphan contractors */}
            {orphans.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#ef4444',
                  padding: '4px 0 8px', letterSpacing: 0.5,
                }}>
                  ⚠️ PAYMENT RECORDS WITHOUT ATTENDANCE TRACKING ({orphans.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orphans.map(c => (
                    <OrphanCard
                      key={c.contractor_id}
                      c={c}
                      onAdopt={handleAdopt}
                      adopting={adopting}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty */}
            {persons.length === 0 && orphans.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9ca3af' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>👷</div>
                {filter
                  ? <div>No results for "<strong>{filter}</strong>"</div>
                  : <div>
                      No people yet.<br />
                      <button onClick={() => setShowAdd(true)} style={{
                        marginTop: 12, padding: '10px 20px', borderRadius: 10,
                        background: '#6366f1', color: '#fff', border: 'none',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}>➕ Add first person</button>
                    </div>
                }
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Sheets ── */}
      {showAdd && (
        <AddPersonSheet
          projectId={projectId}
          onClose={() => setShowAdd(false)}
          onAdded={load}
        />
      )}
      {editPerson && (
        <EditPersonSheet
          person={editPerson}
          onClose={() => setEditPerson(null)}
          onSaved={load}
        />
      )}
      {toggleTarget && (
        <ToggleRoleSheet
          {...toggleTarget}
          onClose={() => setToggleTarget(null)}
          onDone={load}
        />
      )}
    </div>
  );
}
