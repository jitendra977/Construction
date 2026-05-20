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
import { useMqtt } from './MqttContext';
import NfcDevicesPanel from './NfcDevicesPanel';

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
    { label: 'Total Staff',  value: summary.total,           icon: '👥', color: '#6366f1', bg: '#f5f3ff' },
    { label: 'On Duty',     value: summary.active,          icon: '📋', color: '#10b981', bg: '#f0fdf4' },
    { label: 'Payroll',     value: summary.with_payment,    icon: '💰', color: '#f59e0b', bg: '#fffbeb' },
    { label: 'App Users',   value: summary.with_login,      icon: '🔐', color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Verified',    value: summary.with_workforce,  icon: '🛡️', color: '#06b6d4', bg: '#ecfeff' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 18 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: s.bg, borderRadius: 14, padding: '12px 8px',
          textAlign: 'center', border: `1px solid ${s.color}20`,
          transition: 'transform 0.2s, box-shadow 0.2s',
          cursor: 'default'
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{s.label}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
             {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── NFC sync-status helper ────────────────────────────────────────────────────

function nfcSyncStatus(person, nfcDevices) {
  if (!person.nfc_uid)
    return { state: 'no_card',   label: '📵 No Card',     color: '#9ca3af', bg: '#f1f5f9', border: '#e2e8f0', canPush: false };

  if (!nfcDevices || nfcDevices.length === 0)
    return { state: 'no_device', label: '📡 No Device',   color: '#9ca3af', bg: '#f1f5f9', border: '#e2e8f0', canPush: false };

  const healthyDevices = nfcDevices.filter(d => {
    const e = (d.error_state || '').trim();
    return e === '' || e.toUpperCase() === 'OK';
  });
  if (healthyDevices.length === 0)
    return { state: 'err',       label: '⚠️ Device Error', color: '#d97706', bg: '#fffbeb', border: '#fde68a', canPush: false };

  const uidTs = person.nfc_uid_updated_at ? new Date(person.nfc_uid_updated_at) : null;

  const allSynced = healthyDevices.every(d => {
    if (!d.last_push_at) return false;          // never pushed to this device
    if (!uidTs) return false;                    // legacy row, no stamp → unknown → show as Needs Push
    return new Date(d.last_push_at) > uidTs;    // device pushed AFTER uid last changed
  });

  if (allSynced)
    return { state: 'synced',     label: '✅ On Device',  color: '#059669', bg: '#f0fdf4', border: '#86efac', canPush: false };

  return   { state: 'needs_push', label: '📤 Push Needed', color: '#d97706', bg: '#fffbeb', border: '#fde68a', canPush: true  };
}

// ─── Person card ──────────────────────────────────────────────────────────────

function PersonCard({ person, onToggleRole, onToggleActive, onEdit, onAssignCard, toggling, nfcDevices, onPushWorker }) {
  const [expanded, setExpanded]         = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [pushingNfc, setPushingNfc]     = useState(false);
  const [nfcResult, setNfcResult]       = useState(null); // {ok, msg}

  const todayDot  = TODAY_COLOR[person.today_status] || TODAY_COLOR.NOT_MARKED;
  const todayText = person.today_check_in
    ? `In ${person.today_check_in}${person.today_check_out ? ' · Out ' + person.today_check_out : ''}`
    : person.today_status === 'NOT_MARKED' ? 'Not marked' : person.today_status;

  const outOfSync = person.role_payment && !person.in_sync;
  const isActive  = person.is_active !== false;
  const nfcStatus = nfcSyncStatus(person, nfcDevices);

  const handlePushWorker = async (e) => {
    e.stopPropagation();
    setPushingNfc(true);
    setNfcResult(null);
    try {
      const res = await onPushWorker(person.worker_id);
      setNfcResult({ ok: true, msg: `✅ Card pushed to ${res.pushed_to} device(s)` });
      setTimeout(() => setNfcResult(null), 6000);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Push failed';
      setNfcResult({ ok: false, msg: `✗ ${msg}` });
      setTimeout(() => setNfcResult(null), 8000);
    } finally {
      setPushingNfc(false);
    }
  };

  const handleToggleActive = async (e) => {
    e.stopPropagation();
    if (!window.confirm(
      isActive
        ? `Deactivate ${person.name}?\n\nThey will be blocked from NFC door access and attendance immediately.`
        : `Reactivate ${person.name}?\n\nThey will regain NFC door access and attendance.`
    )) return;
    setTogglingActive(true);
    try {
      await onToggleActive(person.worker_id);
    } finally {
      setTogglingActive(false);
    }
  };

  return (
    <div style={{
      background: 'var(--t-surface)', borderRadius: 16,
      border: `1px solid ${isActive ? 'var(--t-border)' : '#fca5a5'}`,
      boxShadow: isActive ? '0 4px 12px rgba(0,0,0,.03)' : '0 4px 12px rgba(239,68,68,.06)',
      overflow: 'hidden', marginBottom: 12,
      opacity: isActive ? 1 : 0.82,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* ── Card header (always visible) ── */}
      <div
        style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <Avatar name={person.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t-text)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
            {person.name}
            {/* Active / Inactive pill — always visible */}
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20,
              background: isActive ? '#dcfce7' : '#fee2e2',
              color:      isActive ? '#15803d' : '#dc2626',
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}>
              {isActive ? '✓ ACTIVE' : '✗ INACTIVE'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, flexWrap: 'wrap' }}>
            <span>{person.trade_label}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ fontWeight: 700, color: 'var(--t-text)' }}>₹{Number(person.daily_rate).toLocaleString()}</span>
            {/* NFC status pill — always visible */}
            <span
              onClick={e => { e.stopPropagation(); if (nfcStatus.canPush && !pushingNfc) handlePushWorker(e); }}
              title={
                nfcStatus.state === 'synced'     ? `Card "${person.nfc_uid}" is loaded on all devices` :
                nfcStatus.state === 'needs_push' ? `Click to push "${person.nfc_uid}" to NFC device(s)` :
                nfcStatus.state === 'no_card'    ? 'No NFC card assigned — use 🪪 Card to assign one' :
                nfcStatus.label
              }
              style={{
                fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                background: nfcStatus.bg, color: nfcStatus.color,
                border: `1px solid ${nfcStatus.border}`,
                cursor: nfcStatus.canPush ? 'pointer' : 'default',
                marginLeft: 2, flexShrink: 0,
                opacity: pushingNfc ? 0.6 : 1,
                transition: 'all .2s',
              }}
            >
              {pushingNfc ? '⏳ Pushing…' : nfcStatus.label}
            </span>
          </div>
          {/* Today badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: todayDot }} />
            <span style={{ fontSize: 11, color: '#6b7280' }}>{todayText}</span>
          </div>
          {/* Quick Actions */}
          {!expanded && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(person); }}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: '#f1f5f9', border: '1px solid #e2e8f0',
                  color: '#374151', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4
                }}
              >✏️ Edit</button>
              <button
                onClick={(e) => { e.stopPropagation(); onAssignCard(person); }}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: '#f0fdf4', border: '1px solid #86efac',
                  color: '#15803d', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4
                }}
              >🪪 Card</button>
            </div>
          )}
        </div>
        {/* Role pills */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <RoleBadge icon="📋" label="Attendance"  enabled={person.role_attendance}             small />
          <RoleBadge icon="💰" label="Payroll"     enabled={person.role_payment}                small />
          <RoleBadge icon="🔐" label="Portal"      enabled={person.role_login}                  small />
          <RoleBadge icon="🛡️" label="Verified"    enabled={!!person.workforce_member_id}       small />
        </div>
        <span style={{ fontSize: 11, color: '#d1d5db', marginLeft: 2 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--t-border)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, background: 'rgba(0,0,0,0.01)' }}>

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
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', flexWrap: 'wrap' }}>
            {person.phone      && <span>📞 {person.phone}</span>}
            {person.joined_date && <span>📅 Joined {person.joined_date}</span>}
          </div>

          {/* ── NFC Card status panel ── */}
          <div style={{
            borderRadius: 12, border: `1.5px solid ${nfcStatus.border}`,
            background: nfcStatus.bg, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            {/* Left: UID + status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: nfcStatus.color, marginBottom: 2 }}>
                {nfcStatus.label}
              </div>
              {person.nfc_uid ? (
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151',
                  background: 'rgba(0,0,0,0.06)', borderRadius: 6, padding: '2px 7px',
                  display: 'inline-block', letterSpacing: '0.05em' }}>
                  {person.nfc_uid}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  Tap "🪪 Card" below to assign an NFC card to this worker.
                </div>
              )}
              {nfcResult && (
                <div style={{
                  marginTop: 6, fontSize: 11, fontWeight: 700,
                  color: nfcResult.ok ? '#059669' : '#dc2626',
                }}>
                  {nfcResult.msg}
                </div>
              )}
            </div>

            {/* Right: push button (only when card assigned and push needed) */}
            {nfcStatus.state === 'needs_push' && (
              <button
                onClick={handlePushWorker}
                disabled={pushingNfc}
                style={{
                  padding: '8px 16px', borderRadius: 9, border: 'none',
                  background: pushingNfc ? '#e5e7eb' : '#d97706',
                  color: pushingNfc ? '#9ca3af' : '#fff',
                  fontSize: 12, fontWeight: 800,
                  cursor: pushingNfc ? 'not-allowed' : 'pointer',
                  flexShrink: 0, whiteSpace: 'nowrap',
                  boxShadow: pushingNfc ? 'none' : '0 2px 8px rgba(217,119,6,0.3)',
                  transition: 'all .2s',
                }}
              >
                {pushingNfc ? '⏳ Pushing…' : '📤 Push to NFC'}
              </button>
            )}
            {nfcStatus.state === 'synced' && (
              <button
                onClick={handlePushWorker}
                disabled={pushingNfc}
                title="Force re-push even though already synced"
                style={{
                  padding: '7px 12px', borderRadius: 9,
                  border: '1px solid #86efac',
                  background: 'transparent',
                  color: '#059669', fontSize: 11, fontWeight: 700,
                  cursor: pushingNfc ? 'not-allowed' : 'pointer',
                  flexShrink: 0, whiteSpace: 'nowrap',
                }}
              >
                {pushingNfc ? '⏳…' : '🔄 Re-push'}
              </button>
            )}
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

          {/* Workforce profile link */}
          {person.workforce_member_id ? (
            <div style={{
              background: '#f0fdf4', border: '1px solid #86efac',
              borderRadius: 8, padding: '8px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 12,
            }}>
              <span style={{ color: '#15803d' }}>
                🗂 Workforce Profile · <strong>{person.workforce_employee_id}</strong>
              </span>
              <a
                href={`/dashboard/desktop/workforce`}
                style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none', fontSize: 11 }}
              >
                View →
              </a>
            </div>
          ) : (
            <div style={{
              background: '#fafafa', border: '1px dashed #d1d5db',
              borderRadius: 8, padding: '8px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 12, color: '#9ca3af',
            }}>
              <span>🗂 No Workforce Profile yet</span>
              <a
                href={`/dashboard/desktop/workforce`}
                style={{ color: '#6b7280', fontWeight: 600, textDecoration: 'none', fontSize: 11 }}
              >
                Import in Workforce →
              </a>
            </div>
          )}

          {/* Role toggles */}
          <div style={{
            background: 'var(--t-bg)', borderRadius: 12, padding: '12px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
            border: `1px solid ${isActive ? 'var(--t-border)' : '#fca5a5'}`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--t-text3)', marginBottom: 2, letterSpacing: '0.05em' }}>ROLES & ACCESS</div>

            {/* ── Active / Inactive master switch ───────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: isActive ? '#f0fdf4' : '#fef2f2',
              borderRadius: 10, padding: '10px 12px',
              border: `1px solid ${isActive ? '#86efac' : '#fca5a5'}`,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#15803d' : '#dc2626' }}>
                  {isActive ? '✓ Worker Active' : '✗ Worker Inactive'}
                </div>
                <div style={{ fontSize: 11, color: isActive ? '#16a34a' : '#ef4444', marginTop: 2 }}>
                  {isActive
                    ? 'NFC door access ✓  ·  Attendance recording ✓'
                    : 'NFC door BLOCKED  ·  Attendance BLOCKED  ·  pushed to device instantly'}
                </div>
              </div>
              <button
                onClick={handleToggleActive}
                disabled={togglingActive}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none',
                  background: togglingActive ? '#d1d5db' : isActive ? '#dc2626' : '#16a34a',
                  color: '#fff', fontWeight: 800, fontSize: 12,
                  cursor: togglingActive ? 'not-allowed' : 'pointer',
                  flexShrink: 0, marginLeft: 12,
                  transition: 'background .2s',
                }}
              >
                {togglingActive ? '…' : isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>

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
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              onClick={() => onEdit(person)}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                color: 'var(--t-text)', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >✏️ Edit</button>
            <button
              onClick={() => onAssignCard(person)}
              style={{
                flex: 1.5, padding: '12px', borderRadius: 12,
                background: '#f0fdf4', border: '1px solid #86efac',
                color: '#15803d', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(34,197,94,0.1)',
              }}
            >🪪 Card</button>
            {outOfSync && (
              <button
                onClick={() => attendanceService.syncFromContractor(person.worker_id).catch(console.error)}
                disabled={toggling}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  background: '#fffbeb', border: '1px solid #fde68a',
                  color: '#92400e', fontSize: 13, fontWeight: 800, cursor: 'pointer',
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
    nfc_uid:         '',
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
        nfc_uid:          form.nfc_uid.trim() || null,
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
          <div style={{ fontWeight: 800, fontSize: 18, color: '#1f2937' }}>👷 Add Staff Member</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            Create a unified record for attendance, payroll, and login
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ fontSize: 12, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: -4 }}>
            1. Basic Information
          </div>
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

          {/* NFC UID */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>NFC Card UID (Optional)</label>
              {window.last_nfc_scan && (
                <button
                  type="button"
                  onClick={() => set('nfc_uid', window.last_nfc_scan)}
                  style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, border: '1px solid #10b981', background: '#f0fdf4', color: '#15803d', cursor: 'pointer', fontWeight: 700 }}
                >
                  Use Last Scan: {window.last_nfc_scan}
                </button>
              )}
            </div>
            <input
              style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase' }}
              placeholder="e.g. 0102030405060708"
              value={form.nfc_uid}
              onChange={e => set('nfc_uid', e.target.value.replace(/\s+/g, ''))}
            />
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
          <div style={{ fontSize: 12, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: -4 }}>
            3. Optional Details
          </div>
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
              color: saving || !form.name.trim() ? '#fff' : '#fff',
              fontSize: 15, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
              marginTop: 4,
              boxShadow: saving ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            {saving ? '⏳ Adding…' : '✅ Add Staff Member'}
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
    nfc_uid:    person.nfc_uid || '',
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
          <div style={{ fontWeight: 800, fontSize: 17, color: '#1f2937' }}>✏️ Edit Staff — {person.name}</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>NFC Card UID</label>
              {window.last_nfc_scan && (
                <button
                  type="button"
                  onClick={() => set('nfc_uid', window.last_nfc_scan)}
                  style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, border: '1px solid #10b981', background: '#f0fdf4', color: '#15803d', cursor: 'pointer', fontWeight: 700 }}
                >
                  Use Last Scan: {window.last_nfc_scan}
                </button>
              )}
            </div>
            <input
              style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase' }}
              placeholder="e.g. 0102030405060708"
              value={form.nfc_uid}
              onChange={e => set('nfc_uid', e.target.value.replace(/\s+/g, ''))}
            />
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
  const [tradeFilter, setTradeFilter] = useState('ALL');

  // Sheets
  const [showAdd, setShowAdd]           = useState(false);
  const [editPerson, setEditPerson]     = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null); // {workerId, role, enable, personName}
  const [adopting, setAdopting]         = useState(null); // contractorId
  const [pairingPerson, setPairingPerson] = useState(null);

  // Push to NFC devices
  const [pushing, setPushing]       = useState(false);
  const [pushResult,   setPushResult]   = useState(null); // { ok, workers, pushed, error }
  const [rebooting,    setRebooting]    = useState(false);
  const [rebootResult, setRebootResult] = useState(null); // { ok, rebooted, error }

  // NFC device status for the header pill
  const [nfcDevices, setNfcDevices] = useState([]);

  const loadNfcStatus = useCallback(() => {
    if (!projectId) return Promise.resolve();
    return attendanceService.getNfcDevices(projectId)
      .then(data => setNfcDevices(data.devices || []))
      .catch(() => setNfcDevices([]));
  }, [projectId]);

  useEffect(() => {
    loadNfcStatus();
    const t = setInterval(loadNfcStatus, 20000); // refresh every 20s
    return () => clearInterval(t);
  }, [loadNfcStatus]);

  // Derived: compute status summary from nfcDevices
  const nfcStatus = (() => {
    if (!nfcDevices.length) return null;
    const now = Date.now();
    const online  = nfcDevices.filter(d => (now - new Date(d.last_seen)) < 10 * 60 * 1000);
    const inError = nfcDevices.filter(d => {
      const e = (d.error_state || '').trim();
      return e !== '' && e.toUpperCase() !== 'OK';
    });
    return { total: nfcDevices.length, online: online.length, inError: inError.length,
             errors: inError.map(d => ({ name: d.device_name || d.mac, state: d.error_state })) };
  })();

  const handlePushToDevices = async () => {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await attendanceService.pushUsersToDevice(projectId, null);
      setPushResult({ ok: true, workers: res.workers, pushed: res.pushed });
      // Refresh device list so last_push_at updates and per-worker badges flip to ✅
      await loadNfcStatus();
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Push failed';
      setPushResult({ ok: false, error: msg });
    } finally {
      setPushing(false);
      setTimeout(() => setPushResult(null), 8000);
    }
  };

  const handleRebootDevices = async () => {
    if (!window.confirm('Reboot all NFC devices for this project? They will reconnect in ~10 seconds.')) return;
    setRebooting(true);
    setRebootResult(null);
    try {
      const res = await attendanceService.rebootDevice(projectId, null);
      setRebootResult({ ok: true, rebooted: res.rebooted });
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Reboot failed';
      setRebootResult({ ok: false, error: msg });
    } finally {
      setRebooting(false);
      setTimeout(() => setRebootResult(null), 8000);
    }
  };

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

  const handleToggleActive = async (workerId) => {
    await attendanceService.togglePersonActive(workerId);
    load();
  };

  const handlePushSingleWorker = async (workerId) => {
    const res = await attendanceService.pushSingleWorker(projectId, workerId);
    // Await refresh so last_push_at updates and the badge flips immediately
    await loadNfcStatus();
    return res;
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
    (!filter || p.name.toLowerCase().includes(filter) || (p.trade_label || '').toLowerCase().includes(filter)) &&
    (tradeFilter === 'ALL' || p.trade === tradeFilter)
  );
  const orphans = (data?.orphan_contractors || []).filter(c =>
    !filter || c.name.toLowerCase().includes(filter)
  );
  const summary = data?.summary || { total: 0, active: 0, with_payment: 0, with_login: 0, orphan_contractors: 0 };

  if (!projectId) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
      Select a project to view staff registry.
    </div>
  );

  return (
    <div style={{ padding: '0 0 100px', maxWidth: 660, margin: '0 auto' }}>

      {/* Title bar */}
      <div style={{ padding: '20px 16px 4px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--t-text)', letterSpacing: '-0.02em' }}>🏷️ Staff NFC Registry</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--t-text3)' }}>Manage worker profiles, roles, and digital identities</p>
        </div>

        {/* ── NFC Device Status Pill ── */}
        {nfcStatus && (() => {
          const hasErr = nfcStatus.inError > 0;
          const allOff = nfcStatus.online === 0;
          const color  = hasErr ? '#dc2626' : allOff ? '#6b7280' : '#059669';
          const bg     = hasErr ? '#fef2f2' : allOff ? '#f3f4f6' : '#f0fdf4';
          const border = hasErr ? '#fca5a5' : allOff ? '#d1d5db' : '#86efac';
          const dot    = hasErr ? '#ef4444' : allOff ? '#9ca3af' : '#22c55e';
          const label  = hasErr
            ? `⚠ ${nfcStatus.inError} error${nfcStatus.inError > 1 ? 's' : ''}`
            : allOff
              ? `${nfcStatus.total} device${nfcStatus.total > 1 ? 's' : ''} offline`
              : `${nfcStatus.online}/${nfcStatus.total} online`;
          const tip = hasErr
            ? nfcStatus.errors.map(e => `${e.name}: ${e.state}`).join('\n')
            : `${nfcStatus.online} device(s) reachable`;
          return (
            <div
              title={tip}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 20,
                background: bg, border: `1.5px solid ${border}`,
                color, fontSize: 12, fontWeight: 700,
                cursor: 'default', userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: dot,
                boxShadow: hasErr ? `0 0 5px ${dot}88` : allOff ? 'none' : `0 0 5px ${dot}88`,
                flexShrink: 0,
              }} />
              📡 {label}
            </div>
          );
        })()}

        {/* Push to NFC Devices button */}
        <button
          onClick={handlePushToDevices}
          disabled={pushing}
          title="Push all active NFC workers to every registered device immediately"
          style={{
            padding: '10px 16px', borderRadius: 12, border: 'none',
            background: pushing ? '#e5e7eb' : '#059669',
            color: pushing ? '#9ca3af' : '#fff',
            fontSize: 13, fontWeight: 800,
            cursor: pushing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: pushing ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.3)',
            transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: 15 }}>{pushing ? '⏳' : '📤'}</span>
          {pushing ? 'Pushing…' : 'Push to NFC'}
        </button>

        {/* Reboot Device(s) button */}
        {nfcDevices.length > 0 && (
          <button
            onClick={handleRebootDevices}
            disabled={rebooting}
            title="Send reboot command to all NFC devices for this project"
            style={{
              padding: '10px 14px', borderRadius: 12, border: 'none',
              background: rebooting ? '#e5e7eb' : '#dc2626',
              color: rebooting ? '#9ca3af' : '#fff',
              fontSize: 13, fontWeight: 800,
              cursor: rebooting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: rebooting ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 15 }}>{rebooting ? '⏳' : '🔄'}</span>
            {rebooting ? 'Rebooting…' : 'Reboot'}
          </button>
        )}
        <button onClick={() => setShowAdd(true)} style={{
          padding: '10px 20px', borderRadius: 12, border: 'none',
          background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 800,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          transition: 'all 0.2s'
        }}>
          <span style={{ fontSize: 16 }}>➕</span> Add Staff
        </button>
      </div>

      {/* Push result banner */}
      {pushResult && (
        <div style={{
          margin: '8px 16px 0',
          padding: '10px 14px',
          borderRadius: 10,
          background: pushResult.ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${pushResult.ok ? '#86efac' : '#fca5a5'}`,
          color: pushResult.ok ? '#166534' : '#991b1b',
          fontWeight: 600, fontSize: 13,
        }}>
          {pushResult.ok
            ? `✓ Pushed ${pushResult.workers} workers to ${pushResult.pushed} device(s). Cards will work instantly.`
            : `✗ ${pushResult.error}`}
        </div>
      )}

      {/* Reboot result banner */}
      {rebootResult && (
        <div style={{
          margin: '8px 16px 0',
          padding: '10px 14px',
          borderRadius: 10,
          background: rebootResult.ok ? '#fff7ed' : '#fef2f2',
          border: `1px solid ${rebootResult.ok ? '#fed7aa' : '#fca5a5'}`,
          color: rebootResult.ok ? '#9a3412' : '#991b1b',
          fontWeight: 600, fontSize: 13,
        }}>
          {rebootResult.ok
            ? `🔄 Reboot command sent to ${rebootResult.rebooted} device(s). They will reconnect in ~10 seconds.`
            : `✗ ${rebootResult.error}`}
        </div>
      )}

      <div style={{ padding: '12px 16px' }}>
        {/* Scanner Status Bar */}
        <ScannerStatusBar />

        {/* Summary */}
        {data && <SummaryBanner summary={summary} />}

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            style={{
              flex: 1, minWidth: 150, padding: '12px 16px', borderRadius: 14,
              border: '1.5px solid var(--t-border)', fontSize: 14, background: 'var(--t-surface)', color: 'var(--t-text)',
            }}
            placeholder="🔍  Search name or trade…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select 
            value={tradeFilter}
            onChange={e => setTradeFilter(e.target.value)}
            style={{
              padding: '12px 14px', borderRadius: 14,
              border: '1.5px solid var(--t-border)', fontSize: 13, background: 'var(--t-surface)',
              color: 'var(--t-text)', cursor: 'pointer', outline: 'none'
            }}
          >
            <option value="ALL">All Trades</option>
            {TRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => setShowInactive(s => !s)}
            style={{
              padding: '12px 14px', borderRadius: 14, border: '1.5px solid var(--t-border)',
              background: showInactive ? 'rgba(245,158,11,0.1)' : 'var(--t-surface)',
              color: showInactive ? '#d97706' : 'var(--t-text3)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >{showInactive ? '👁 All' : '👁 Active'}</button>
          <button onClick={() => { load(); loadNfcStatus(); }} style={{
            padding: '12px 14px', borderRadius: 14, border: '1.5px solid var(--t-border)',
            background: 'var(--t-surface)', color: 'var(--t-text3)', fontSize: 16, cursor: 'pointer',
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
                    onToggleActive={handleToggleActive}
                    onEdit={setEditPerson}
                    onAssignCard={setPairingPerson}
                    toggling={false}
                    nfcDevices={nfcDevices}
                    onPushWorker={handlePushSingleWorker}
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

      {/* ── NFC Device Fleet ── */}
      <div style={{ padding: '0 16px', marginTop: 8 }}>
        <div style={{
          height: 1, background: 'var(--t-border)', margin: '16px 0',
        }} />
        <NfcDevicesPanel projectId={projectId} />
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
      {pairingPerson && (
        <PairingModal
          person={pairingPerson}
          onClose={() => setPairingPerson(null)}
          onAssigned={(uid) => {
            load();
            setPairingPerson(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function ScannerStatusBar() {
  const mqtt = useMqtt();
  if (!mqtt) return null;
  const { lastScan, status, clearScan } = mqtt;
  if (status !== 'Connected' && !lastScan) return null;

  return (
    <div style={{
      background: lastScan ? '#f0fdf4' : '#fff',
      border: `1px solid ${lastScan ? '#22c55e' : '#e5e7eb'}`,
      borderRadius: 16, padding: '10px 16px', marginBottom: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: lastScan ? '0 4px 12px rgba(34, 197, 94, 0.15)' : '0 2px 4px rgba(0,0,0,0.05)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
         <div style={{
           width: 10, height: 10, borderRadius: '50%',
           background: status === 'Connected' ? '#22c55e' : '#ef4444',
           boxShadow: status === 'Connected' ? '0 0 8px #22c55e' : 'none'
         }} />
         <div>
           <div style={{ fontSize: 13, fontWeight: 800, color: '#1f2937' }}>
             {status === 'Connected' ? 'NFC Scanner Ready' : 'Scanner Offline'}
           </div>
           <div style={{ fontSize: 10, color: '#6b7280' }}>
             {status === 'Connected' ? 'Awaiting card tap...' : 'Check MQTT settings'}
           </div>
         </div>
      </div>

      {lastScan && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, animation: 'slideInRight 0.3s ease-out' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>Recent Scan</div>
            <code style={{ fontSize: 14, fontWeight: 900, color: '#064e3b', letterSpacing: 0.5 }}>{lastScan.uid}</code>
          </div>
          <button
            onClick={clearScan}
            style={{
              background: '#fff', border: '1px solid #d1fae5', borderRadius: '50%',
              width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#059669', fontSize: 14
            }}
          >×</button>
        </div>
      )}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Pairing Modal ──────────────────────────────────────────────────────────

function PairingModal({ person, onClose, onAssigned }) {
  const mqtt = useMqtt();
  const { lastScan, setLastScan, status, clearScan } = mqtt || { lastScan: null, setLastScan: () => {}, status: 'Disconnected', clearScan: () => {} };
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleAssign = async () => {
    if (!lastScan) return;
    setSaving(true); setErr('');
    try {
      await attendanceService.updatePerson(person.worker_id, { nfc_uid: lastScan.uid });
      onAssigned(lastScan.uid);
      clearScan();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to assign card.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 32, width: '100%', maxWidth: 420,
        padding: 32, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }} onClick={e => e.stopPropagation()}>

        {/* Decorative background element */}
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />

        <div style={{
          width: 80, height: 80, background: '#f5f3ff', borderRadius: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, margin: '0 auto 20px', color: '#6366f1',
          boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.2)'
        }}>
          {lastScan ? '✨' : '🪪'}
        </div>

        <h3 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900, color: '#1e293b' }}>
          Assign NFC Card
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
          Tap a card on the reader to link it with<br/>
          <strong style={{ color: '#1e293b' }}>{person.name}</strong>
        </p>

        <div style={{
          background: lastScan ? '#f0fdf4' : '#f8fafc',
          border: `2px solid ${lastScan ? '#22c55e' : '#e2e8f0'}`,
          borderRadius: 24, padding: '32px 24px', marginBottom: 24,
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: lastScan ? 'scale(1.02)' : 'scale(1)',
          position: 'relative'
        }}>
          {!lastScan ? (
            <>
              <div style={{
                fontSize: 12, fontWeight: 800, letterSpacing: 1,
                color: status === 'Connected' ? '#10b981' : '#f59e0b',
                textTransform: 'uppercase', marginBottom: 12
              }}>
                {status === 'Connected' ? '● Scanner Active' : '○ Scanner Offline'}
              </div>
              <div className="pulse-text" style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8' }}>
                Waiting for tap...
              </div>
            </>
          ) : (
            <>
              <div style={{
                position: 'absolute', top: 12, right: 12,
                background: '#22c55e', color: '#fff', fontSize: 10,
                padding: '4px 10px', borderRadius: 20, fontWeight: 900
              }}>READY</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: 8 }}>Card Detected</div>
              <div style={{ fontSize: 28, fontWeight: 950, color: '#064e3b', fontFamily: 'monospace', letterSpacing: 1 }}>
                {lastScan.uid}
              </div>
              <div style={{ fontSize: 11, color: '#10b981', marginTop: 10, fontWeight: 600 }}>
                Scan received at {lastScan.timestamp.toLocaleTimeString()}
              </div>
            </>
          )}
        </div>

        {err && (
          <div style={{
            background: '#fef2f2', color: '#dc2626', padding: '12px',
            borderRadius: 12, fontSize: 13, marginBottom: 20, fontWeight: 600,
            border: '1px solid #fee2e2'
          }}>
            ⚠️ {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '16px', borderRadius: 16, border: '1px solid #e2e8f0',
              background: '#fff', color: '#64748b', fontWeight: 800, fontSize: 15,
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >Cancel</button>
          <button
            onClick={handleAssign}
            disabled={!lastScan || saving}
            style={{
              flex: 1.5, padding: '16px', borderRadius: 16, border: 'none',
              background: lastScan ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : '#e2e8f0',
              color: '#fff', fontWeight: 800, fontSize: 15,
              cursor: lastScan ? 'pointer' : 'not-allowed',
              boxShadow: lastScan ? '0 10px 15px -3px rgba(79, 70, 229, 0.3)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {saving ? 'Saving...' : 'Link Card'}
          </button>
        </div>

        {lastScan && (
           <button
             onClick={clearScan}
             style={{
               background: 'none', border: 'none', color: '#6366f1',
               fontSize: 12, fontWeight: 800, marginTop: 20, cursor: 'pointer',
               textDecoration: 'underline'
             }}
           >
             Scan different card
           </button>
        )}

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes pulse-text { 0% { opacity: 0.5 } 50% { opacity: 1 } 100% { opacity: 0.5 } }
          .pulse-text { animation: pulse-text 2s infinite ease-in-out }
        `}</style>
      </div>
    </div>
  );
}
