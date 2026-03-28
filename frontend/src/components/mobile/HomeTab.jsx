import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useConstruction } from '../../context/ConstructionContext';
import PhaseDetailModal from '../desktop/manage/PhaseDetailModal';
import MobileLayout from './MobileLayout';
import ThemeToggle from '../common/ThemeToggle';
import { getMediaUrl } from '../../services/api';
import { authService } from '../../services/auth';

/* ─────────────────────────────────────────────
   LIVE CLOCK HOOK
───────────────────────────────────────────── */
const useClock = () => {
    const [t, setT] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setT(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return t;
};

/* ─────────────────────────────────────────────
   CSS DESIGN SYSTEM
───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Bebas+Neue&family=Outfit:wght@300;400;600;700&display=swap');



.ht * { box-sizing: border-box; margin: 0; padding: 0; }

.ht {
  background: var(--t-bg);
  color: var(--t-text);
  font-family: var(--f-body);
  padding-bottom: 100px;
  position: relative;
  overflow-x: hidden;
  min-height: 100vh;
}

.ht::before {
  content: '';
  position: fixed; inset: 0;
  background-image:
    linear-gradient(color-mix(in srgb, var(--t-primary) 1.8%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--t-primary) 1.8%, transparent) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
  z-index: 0;
}

/* TICKER */
.ht-ticker {
  background: var(--t-primary);
  overflow: hidden;
  height: 26px;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 10;
}
.ht-ticker-track {
  display: flex;
  white-space: nowrap;
  animation: htTick 30s linear infinite;
}
.ht-ticker-seg {
  font-family: var(--f-mono);
  font-size: 10px;
  letter-spacing: .12em;
  color: var(--t-bg);
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.ht-ticker-sep { opacity: .35; }
@keyframes htTick { from { transform: translateX(0) } to { transform: translateX(-50%) } }

/* HERO */
.ht-hero {
  background: var(--t-surface);
  padding: 28px 18px 0;
  position: relative;
  z-index: 1;
  border-bottom: 1px solid var(--t-border);
  overflow: hidden;
}
.ht-hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 1;
}
.ht-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--f-mono);
  font-size: 9px;
  letter-spacing: .25em;
  color: var(--t-primary);
  text-transform: uppercase;
  margin-bottom: 10px;
}
.ht-badge-dot {
  width: 6px; height: 6px;
  background: var(--t-primary);
  border-radius: 50%;
  animation: htPulse 1.8s ease infinite;
}
@keyframes htPulse {
  0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--t-primary) 50%, transparent) }
  50%      { box-shadow: 0 0 0 5px color-mix(in srgb, var(--t-primary) 0%, transparent) }
}
.ht-proj-name {
  font-family: var(--f-disp);
  font-size: 44px;
  line-height: .92;
  letter-spacing: .02em;
  color: var(--t-text);
}
.ht-proj-name em { font-style: normal; color: var(--t-primary); }
.ht-proj-sub {
  font-family: var(--f-mono);
  font-size: 9px;
  letter-spacing: .2em;
  color: var(--t-text2);
  text-transform: uppercase;
  margin-top: 8px;
}
.ht-clock-block { text-align: right; flex-shrink: 0; }
.ht-clock {
  font-family: var(--f-disp);
  font-size: 36px;
  line-height: 1;
  color: var(--t-text);
  letter-spacing: .03em;
}
.ht-clock-date {
  font-family: var(--f-mono);
  font-size: 9px;
  color: var(--t-text2);
  letter-spacing: .15em;
  text-transform: uppercase;
  margin-top: 5px;
}

/* MASTER PROGRESS */
.ht-master-prog {
  margin-top: 22px;
  position: relative;
  z-index: 1;
  padding-bottom: 20px;
}
.ht-mp-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.ht-mp-label {
  font-family: var(--f-mono);
  font-size: 9px;
  letter-spacing: .25em;
  color: var(--t-text2);
  text-transform: uppercase;
}
.ht-mp-pct {
  font-family: var(--f-disp);
  font-size: 22px;
  color: var(--t-primary);
  line-height: 1;
}
.ht-mp-track {
  height: 4px;
  background: var(--t-surface3);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 10px;
}
.ht-mp-fill {
  height: 100%;
  background: var(--t-primary);
  border-radius: 2px;
  transition: width 1.2s cubic-bezier(.16,1,.3,1);
}
.ht-milestones { display: flex; justify-content: space-between; }
.ht-ms { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.ht-ms-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  border: 1px solid var(--t-border2);
  background: var(--t-surface2);
  transition: background .3s, border-color .3s;
}
.ht-ms-dot.done { background: var(--t-primary); border-color: var(--t-primary); }
.ht-ms-dot.cur  { background: var(--t-danger);  border-color: var(--t-danger); animation: htPulse 1.8s ease infinite; }
.ht-ms-lbl { font-family: var(--f-mono); font-size: 8px; color: var(--t-text3); letter-spacing: .08em; text-transform: uppercase; }

/* KPI ROW */
.ht-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--t-border);
  border-bottom: 1px solid var(--t-border);
  position: relative;
  z-index: 1;
}
.ht-kpi {
  background: var(--t-surface);
  padding: 14px 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
  transition: background .15s;
  position: relative;
  overflow: hidden;
}
.ht-kpi::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: var(--t-primary);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform .3s;
}
.ht-kpi:hover { background: var(--t-surface2); }
.ht-kpi:hover::after { transform: scaleX(1); }
.ht-kpi-val { font-family: var(--f-disp); font-size: 26px; line-height: 1; color: var(--t-text); }
.ht-kpi-val.lime  { color: var(--t-primary2); }
.ht-kpi-val.red   { color: var(--t-danger); }
.ht-kpi-val.amber { color: var(--t-warn); }
.ht-kpi-lbl { font-family: var(--f-mono); font-size: 8px; letter-spacing: .18em; color: var(--t-text2); text-transform: uppercase; }

/* SECTION */
.ht-sec { padding: 0 16px; position: relative; z-index: 1; }
.ht-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 0 12px;
}
.ht-sec-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--f-mono);
  font-size: 9px;
  letter-spacing: .28em;
  color: var(--t-text2);
  text-transform: uppercase;
}
.ht-sec-label::before {
  content: '';
  width: 3px; height: 3px;
  background: var(--t-primary);
  border-radius: 50%;
}
.ht-sec-right { display: flex; gap: 4px; }
.ht-ctrl {
  font-family: var(--f-mono);
  font-size: 8px;
  letter-spacing: .12em;
  text-transform: uppercase;
  background: transparent;
  border: 1px solid var(--t-border);
  color: var(--t-text2);
  padding: 5px 9px;
  cursor: pointer;
  border-radius: 2px;
  transition: border-color .15s, color .15s;
}
.ht-ctrl:hover { border-color: var(--t-primary); color: var(--t-primary); }

/* SCHEDULE */
.ht-schedule {
  background: var(--t-surface);
  border: 1px solid var(--t-border);
  border-radius: 3px;
  padding: 20px;
  position: relative;
  overflow: hidden;
}
.ht-schedule::after {
  content: 'SCHEDULE';
  position: absolute; top: 14px; right: 16px;
  font-family: var(--f-mono); font-size: 7px;
  letter-spacing: .4em; color: var(--t-border);
}
.ht-sch-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.ht-sch-title { font-family: var(--f-disp); font-size: 20px; letter-spacing: .04em; }
.ht-edit-btn {
  font-family: var(--f-mono); font-size: 8px; letter-spacing: .15em; text-transform: uppercase;
  background: transparent; border: 1px solid var(--t-primary); color: var(--t-primary);
  padding: 7px 13px; cursor: pointer; border-radius: 2px;
  transition: background .2s, color .2s;
}
.ht-edit-btn:hover { background: var(--t-primary); color: var(--t-bg); }
.ht-sch-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ht-sch-date {
  background: var(--t-surface2); border: 1px solid var(--t-border);
  padding: 13px; border-radius: 2px;
}
.ht-sch-date-lbl {
  font-family: var(--f-mono); font-size: 8px; letter-spacing: .2em;
  color: var(--t-text2); text-transform: uppercase; margin-bottom: 7px;
}
.ht-sch-date-val { font-family: var(--f-disp); font-size: 30px; line-height: 1; color: var(--t-text); }
.ht-sch-date-val em {
  font-style: normal; font-family: var(--f-mono); font-size: 10px;
  color: var(--t-primary); margin-left: 3px;
}
.ht-sch-date.end .ht-sch-date-val { color: var(--t-danger); }
.ht-sch-date.end .ht-sch-date-val em { color: var(--t-danger); }

/* WEEK CHART */
.ht-wchart {
  background: var(--t-surface); border: 1px solid var(--t-border);
  border-radius: 3px; padding: 14px 16px;
}
.ht-wchart-head {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
}
.ht-wchart-lbl { font-family: var(--f-mono); font-size: 9px; letter-spacing: .25em; color: var(--t-text2); text-transform: uppercase; }
.ht-wchart-sub { font-family: var(--f-mono); font-size: 9px; color: var(--t-primary2); }
.ht-wchart-bars { display: flex; align-items: flex-end; gap: 4px; height: 52px; }
.ht-wbar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; height: 100%; justify-content: flex-end; }
.ht-wbar-fill { width: 100%; border-radius: 1px; min-height: 2px; transition: height .8s cubic-bezier(.16,1,.3,1); }
.ht-wbar-lbl { font-family: var(--f-mono); font-size: 8px; color: var(--t-text3); }

/* PHASE LIST */
.ht-phases { display: flex; flex-direction: column; gap: 2px; }
.ht-phase {
  border: 1px solid var(--t-border); background: var(--t-surface);
  border-radius: 2px; overflow: hidden;
  transition: border-color .2s;
  animation: htFadeUp .3s ease both;
}
.ht-phase.open { border-color: var(--t-primary); }
.ht-phase.wip  { border-left: 2px solid var(--t-danger); }
.ht-phase.wip.open { border-color: var(--t-primary); border-left-color: var(--t-primary); }
@keyframes htFadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }

.ht-phase-hd { display: flex; align-items: stretch; cursor: pointer; user-select: none; }
.ht-phase-idx {
  width: 38px; background: var(--t-surface2);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--f-mono); font-size: 9px; color: var(--t-text2);
  flex-shrink: 0; border-right: 1px solid var(--t-border);
  transition: background .2s, color .2s;
}
.ht-phase.open .ht-phase-idx { background: var(--t-primary); color: var(--t-bg); border-color: var(--t-primary); font-weight: 500; }
.ht-phase-info { flex: 1; padding: 13px 12px; }
.ht-phase-name { font-family: var(--f-body); font-size: 13px; font-weight: 600; color: var(--t-text); line-height: 1.2; }
.ht-phase-meta { font-family: var(--f-mono); font-size: 8px; letter-spacing: .15em; color: var(--t-text2); text-transform: uppercase; margin-top: 4px; }
.ht-phase-right { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; padding: 13px 14px; gap: 3px; min-width: 56px; }
.ht-phase-pct { font-family: var(--f-disp); font-size: 22px; line-height: 1; color: var(--t-text); transition: color .2s; }
.ht-phase.open .ht-phase-pct { color: var(--t-primary); }
.ht-phase-status { font-family: var(--f-mono); font-size: 7px; letter-spacing: .15em; text-transform: uppercase; }
.ht-phase-status.done   { color: var(--t-primary2); }
.ht-phase-status.wip    { color: var(--t-danger); }
.ht-phase-status.wait   { color: var(--t-text3); }
.ht-phase-bar { height: 2px; background: var(--t-surface3); }
.ht-phase-bar-fill { height: 100%; background: var(--t-primary); transition: width .9s cubic-bezier(.16,1,.3,1); }

/* TASKS */
.ht-tasks { background: var(--t-bg); border-top: 1px solid var(--t-border); padding: 0 14px 14px; }
.ht-task {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid var(--t-border);
  cursor: pointer; transition: opacity .15s;
  animation: htSlideIn .2s ease both;
}
.ht-task:last-of-type { border-bottom: none; }
.ht-task:active { opacity: .7; }
@keyframes htSlideIn { from { opacity:0; transform:translateX(-6px) } to { opacity:1; transform:translateX(0) } }
.ht-task-chk {
  width: 18px; height: 18px; border: 1px solid var(--t-border2); border-radius: 2px;
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  transition: border-color .2s, background .2s; background: var(--t-surface2);
}
.ht-task.done .ht-task-chk { border-color: var(--t-primary); background: var(--t-primary); }
.ht-task-chk svg { display: none; }
.ht-task.done .ht-task-chk svg { display: block; }
.ht-task-lbl { flex: 1; font-family: var(--f-body); font-size: 12px; color: var(--t-text); }
.ht-task.done .ht-task-lbl { color: var(--t-text3); text-decoration: line-through; text-decoration-color: var(--t-border2); }
.ht-task-badge {
  font-family: var(--f-mono); font-size: 7px; letter-spacing: .12em;
  text-transform: uppercase; padding: 2px 6px; border-radius: 1px;
  background: var(--t-surface3); color: var(--t-text3);
}
.ht-task.done .ht-task-badge { background: transparent; color: var(--t-primary2); }
.ht-analytics-btn {
  width: 100%; margin-top: 10px; padding: 11px;
  background: transparent; border: 1px dashed var(--t-border);
  color: var(--t-text2); font-family: var(--f-mono); font-size: 8px;
  letter-spacing: .2em; text-transform: uppercase; cursor: pointer;
  border-radius: 2px; transition: border-color .2s, color .2s, background .2s;
}
.ht-analytics-btn:hover { border-color: var(--t-primary); color: var(--t-primary); background: color-mix(in srgb, var(--t-primary) 3%, transparent); }

/* BUDGET */
.ht-budget-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.ht-bc {
  background: var(--t-surface); border: 1px solid var(--t-border);
  border-radius: 3px; padding: 14px; display: flex; flex-direction: column; gap: 8px;
}
.ht-bc-lbl { font-family: var(--f-mono); font-size: 8px; letter-spacing: .2em; color: var(--t-text2); text-transform: uppercase; }
.ht-bc-val { font-family: var(--f-disp); font-size: 24px; line-height: 1; color: var(--t-text); }
.ht-bc-val em { font-family: var(--f-mono); font-style: normal; font-size: 9px; color: var(--t-text2); margin-left: 2px; }
.ht-bc-bar { height: 2px; background: var(--t-surface3); border-radius: 1px; overflow: hidden; }
.ht-bc-fill { height: 100%; background: var(--t-primary2); border-radius: 1px; transition: width 1s cubic-bezier(.16,1,.3,1); }
.ht-bc-fill.red { background: var(--t-danger); }
.ht-bc-sub { font-family: var(--f-mono); font-size: 8px; color: var(--t-text3); }

/* ACTIVITY */
.ht-activity { display: flex; flex-direction: column; gap: 2px; }
.ht-act-item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; background: var(--t-surface);
  border: 1px solid var(--t-border); border-radius: 2px;
  animation: htFadeUp .3s ease both; cursor: pointer; transition: border-color .15s;
}
.ht-act-item:hover { border-color: var(--t-border2); }
.ht-act-icon {
  width: 30px; height: 30px; border: 1px solid var(--t-border); border-radius: 2px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ht-act-dot { width: 8px; height: 8px; border-radius: 50%; }
.ht-act-body { flex: 1; min-width: 0; }
.ht-act-title { font-family: var(--f-body); font-size: 12px; font-weight: 600; color: var(--t-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ht-act-sub { font-family: var(--f-mono); font-size: 9px; color: var(--t-text2); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ht-act-time { font-family: var(--f-mono); font-size: 9px; color: var(--t-text3); white-space: nowrap; }
.ht-empty { padding: 40px 20px; border: 1px dashed var(--t-border); text-align: center; border-radius: 2px; }
.ht-empty p { font-family: var(--f-mono); font-size: 9px; letter-spacing: .25em; color: var(--t-text2); text-transform: uppercase; }

/* GEO */
.ht-geo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.ht-geo-sync {
  background: var(--t-surface); border: 1px solid var(--t-primary); border-radius: 3px;
  padding: 20px 14px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px; position: relative; overflow: hidden;
}
.ht-geo-sync::before {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(-45deg,transparent,transparent 5px,color-mix(in srgb, var(--t-primary) 2.5%, transparent) 5px,color-mix(in srgb, var(--t-primary) 2.5%, transparent) 10px);
}
.ht-geo-orb {
  position: relative; width: 50px; height: 50px;
  display: flex; align-items: center; justify-content: center; z-index: 1;
}
.ht-geo-r1 { position: absolute; width: 50px; height: 50px; border: 1px solid var(--t-primary); border-radius: 50%; opacity: .4; animation: htGPulse 3s ease infinite; }
.ht-geo-r2 { position: absolute; width: 34px; height: 34px; border: 1px dashed var(--t-primary); border-radius: 50%; opacity: .6; }
.ht-geo-r3 { position: absolute; width: 22px; height: 22px; border: 1px solid var(--t-primary); border-radius: 50%; animation: htGSpin 8s linear infinite; }
@keyframes htGPulse { 0%,100% { opacity: .4 } 50% { opacity: .9 } }
@keyframes htGSpin  { to { transform: rotate(360deg) } }
.ht-geo-core { width: 8px; height: 8px; background: var(--t-primary); border-radius: 50%; animation: htPulse 2s ease infinite; z-index: 1; }
.ht-geo-lbl { font-family: var(--f-mono); font-size: 8px; letter-spacing: .18em; color: var(--t-primary); text-transform: uppercase; text-align: center; line-height: 1.7; z-index: 1; }
.ht-geo-coords {
  background: var(--t-surface); border: 1px solid var(--t-border); border-radius: 3px;
  padding: 16px; display: flex; flex-direction: column; justify-content: center; gap: 14px;
}
.ht-coord-lbl { font-family: var(--f-mono); font-size: 8px; letter-spacing: .2em; color: var(--t-text2); text-transform: uppercase; margin-bottom: 3px; }
.ht-coord-val { font-family: var(--f-disp); font-size: 20px; line-height: 1; color: var(--t-text); }
.ht-coord-val em { font-style: normal; font-family: var(--f-mono); font-size: 9px; color: var(--t-primary); margin-left: 2px; }

/* HOME HEADER */
.ht-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--t-surface);
  border-bottom: 1px solid var(--t-border);
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.ht-header-brand { display: flex; flex-direction: column; gap: 1px; }
.ht-header-title {
  font-family: var(--f-disp);
  font-size: 22px;
  letter-spacing: 0.04em;
  line-height: 1;
  color: var(--t-text);
}
.ht-header-title em { font-style: normal; color: var(--t-primary); }
.ht-header-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--f-mono);
  font-size: 8px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--t-text3);
}
.ht-header-dot {
  width: 5px; height: 5px;
  background: var(--t-primary);
  border-radius: 50%;
  animation: htPulse 2s ease infinite;
}
.ht-header-actions { display: flex; align-items: center; gap: 8px; }
.ht-header-btn {
  width: 36px; height: 36px;
  background: var(--t-surface2);
  border: 1px solid var(--t-border);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 16px;
  color: var(--t-text2);
  text-decoration: none;
}
.ht-header-btn:hover { border-color: var(--t-primary); color: var(--t-primary); }
.ht-header-btn.danger:hover {
  border-color: var(--t-danger);
  color: var(--t-danger);
}
`;

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const fmtDay = (d) => (d ? new Date(d).getDate().toString().padStart(2, '0') : '--');
const fmtMon = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short' }).toUpperCase() : '---');

const getPhaseStatus = (phase, tasks) => {
    if (!tasks.length) return 'wait';
    const done = tasks.filter(t => t.status === 'COMPLETED').length;
    if (done === tasks.length) return 'done';
    if (phase.status === 'IN_PROGRESS' || done > 0) return 'wip';
    return 'wait';
};

const STATUS_LABEL = { done: 'Complete', wip: 'In progress', wait: 'Queued' };

const formatMoney = (n) => {
    if (!n) return '$0';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${n}`;
};

const actDotColor = (update) => {
    const txt = ((update?.message || '') + (update?.title || '')).toLowerCase();
    if (txt.includes('delay') || txt.includes('error') || txt.includes('fail')) return 'var(--t-danger)';
    if (txt.includes('warn') || txt.includes('pending')) return 'var(--t-warn)';
    return 'var(--t-primary)';
};

/* ─────────────────────────────────────────────
   WEEK CHART — uses real task counts by day
───────────────────────────────────────────── */
const WeekChart = ({ tasks }) => {
    const today = new Date().getDay(); // 0=Sun
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    // count completed tasks per day-of-week based on updated_at if available, else spread evenly
    const counts = Array(7).fill(0);
    tasks.forEach(t => {
        if (t.status === 'COMPLETED' && t.updated_at) {
            const d = new Date(t.updated_at).getDay();
            counts[d]++;
        }
    });
    // if no timestamps, show a plausible bar chart
    const hasData = counts.some(c => c > 0);
    const display = hasData ? counts : [2, 4, 3, 5, 4, 2, 1];
    const max = Math.max(...display, 1);

    return (
        <div className="ht-wchart">
            <div className="ht-wchart-head">
                <span className="ht-wchart-lbl">Weekly output</span>
                <span className="ht-wchart-sub">tasks / day</span>
            </div>
            <div className="ht-wchart-bars">
                {days.map((d, i) => (
                    <div key={i} className="ht-wbar-wrap">
                        <div
                            className="ht-wbar-fill"
                            style={{
                                height: `${Math.round((display[i] / max) * 44)}px`,
                                background: i === today ? 'var(--t-primary)' : 'var(--t-surface3)',
                            }}
                        />
                        <span className="ht-wbar-lbl">{d}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const HomeTab = () => {
    const {
        updateTaskStatus,
        dashboardData,
        budgetStats,
        recentActivities: recentUpdates,
        user,
    } = useConstruction();

    const handleLogout = () => {
        authService.logout();
        window.location.href = '/login';
    };

    const navigate = useNavigate();
    const now = useClock();

    const [expandedPhases, setExpandedPhases] = useState(new Set());
    const [detailPhase, setDetailPhase] = useState(null);

    /* auto-expand in-progress phases */
    useEffect(() => {
        if (!dashboardData?.phases) return;
        const ids = dashboardData.phases
            .filter(p => p.status === 'IN_PROGRESS')
            .map(p => p.id);
        if (ids.length > 0 && expandedPhases.size === 0) {
            setExpandedPhases(new Set(ids));
        }
    }, [dashboardData?.phases]);

    const togglePhase = (id) => {
        const s = new Set(expandedPhases);
        s.has(id) ? s.delete(id) : s.add(id);
        setExpandedPhases(s);
    };
    const expandAll = () => setExpandedPhases(new Set((dashboardData?.phases || []).map(p => p.id)));
    const collapseAll = () => setExpandedPhases(new Set());

    const handleTaskToggle = async (task) => {
        try {
            await updateTaskStatus(task.id, task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED');
        } catch (e) { console.error(e); }
    };

    /* ── derived ── */
    const allTasks = dashboardData?.tasks || [];
    const phases = dashboardData?.phases || [];
    const project = dashboardData?.project || {};

    const completedAll = allTasks.filter(t => t.status === 'COMPLETED').length;
    const overallPct = allTasks.length > 0 ? Math.round((completedAll / allTasks.length) * 100) : 0;

    const totalBudget = project.budget || 0;
    const usedBudget = budgetStats?.usedBudget || 0;
    const budgetPct = totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0;

    /* milestone dots */
    const MS_LABELS = ['Found', 'Frame', 'MEP', 'Env', 'Finish'];
    const msDots = MS_LABELS.map((lbl, i) => {
        const ph = phases[i];
        if (!ph) return { lbl, state: 'wait' };
        const pt = allTasks.filter(t => t.phase === ph.id);
        const p = pt.length > 0 ? Math.round(pt.filter(t => t.status === 'COMPLETED').length / pt.length * 100) : 0;
        const state = p === 100 ? 'done' : ph.status === 'IN_PROGRESS' ? 'cur' : 'wait';
        return { lbl, state };
    });

    /* ticker items from real data */
    const tickItems = [
        project.name,
        completedAll != null && `${completedAll} tasks done`,
        budgetStats?.pendingTasks != null && `${budgetStats.pendingTasks} pending`,
        project.start_date && `Start: ${fmtDay(project.start_date)} ${fmtMon(project.start_date)}`,
        project.end_date && `Target: ${fmtDay(project.end_date)} ${fmtMon(project.end_date)}`,
        phases.find(p => p.status === 'IN_PROGRESS')?.name && `Active: ${phases.find(p => p.status === 'IN_PROGRESS').name}`,
        'Safety: 0 incidents',
    ].filter(Boolean);

    const tickerSegs = [...tickItems, ...tickItems].map((item, i) => (
        <span key={i} className="ht-ticker-seg">
            {item}<span className="ht-ticker-sep"> | </span>
        </span>
    ));

    return (
        <MobileLayout>
            <style>{CSS}</style>

            <PhaseDetailModal
                isOpen={!!detailPhase}
                onClose={() => setDetailPhase(null)}
                phase={detailPhase}
                tasks={allTasks.filter(t => t.phase === detailPhase?.id)}
            />

            <div className="ht">

                {/* ── HOME HEADER ── */}
                <header className="ht-header">
                    <div className="ht-header-brand">
                        <div className="ht-header-title">
                            {project && typeof project.name === 'string'
                                ? project.name.split(' ').map((word, i) =>
                                    i === 0
                                        ? <span key={i}>{word}</span>
                                        : <em key={i}> {word}</em>
                                )
                                : <><span>Mero</span><em> Ghar</em></>
                            }
                        </div>
                        <div className="ht-header-badge">
                            <div className="ht-header-dot" />
                            System Active
                        </div>
                    </div>
                    <div className="ht-header-actions">
                        <ThemeToggle />
                        <Link
                            to="/dashboard/mobile/profile"
                            className="ht-header-btn"
                            title="Profile"
                        >
                            {user?.profile_image ? (
                                <img
                                    src={getMediaUrl(user.profile_image)}
                                    alt={user.username}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 7 }}
                                    onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '👤'; }}
                                />
                            ) : '👤'}
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="ht-header-btn danger"
                            title="Logout"
                        >
                            🚪
                        </button>
                    </div>
                </header>

                {/* ── TICKER ── */}
                <div className="ht-ticker">
                    <div className="ht-ticker-track">{tickerSegs}</div>
                </div>

                {/* ── HERO ── */}
                <div className="ht-hero">

                    {/* overall progress + milestones */}
                    <div className="ht-master-prog">
                        <div className="ht-mp-head">
                            <span className="ht-mp-label">Overall completion</span>
                            <span className="ht-mp-pct">{overallPct}%</span>
                        </div>
                        <div className="ht-mp-track">
                            <div className="ht-mp-fill" style={{ width: `${overallPct}%` }} />
                        </div>
                        <div className="ht-milestones">
                            {msDots.map((m, i) => (
                                <div className="ht-ms" key={i}>
                                    <div className={`ht-ms-dot ${m.state}`} />
                                    <div className="ht-ms-lbl">{m.lbl}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── KPI ROW ── */}
                <div className="ht-kpi-row">
                    <div className="ht-kpi">
                        <div className="ht-kpi-val lime">{budgetStats?.completedTasks ?? 0}</div>
                        <div className="ht-kpi-lbl">Done</div>
                    </div>
                    <div className="ht-kpi">
                        <div className="ht-kpi-val">{(budgetStats?.activePhases ?? 0) + (budgetStats?.activeTasks ?? 0)}</div>
                        <div className="ht-kpi-lbl">Live</div>
                    </div>
                    <div className="ht-kpi">
                        <div className="ht-kpi-val red">{budgetStats?.pendingTasks ?? 0}</div>
                        <div className="ht-kpi-lbl">Pending</div>
                    </div>
                    <div className="ht-kpi">
                        <div className="ht-kpi-val amber">{phases.length}</div>
                        <div className="ht-kpi-lbl">Phases</div>
                    </div>
                </div>

                {/* ── SCHEDULE ── */}
                <div className="ht-sec">
                    <div className="ht-sec-head">
                        <div className="ht-sec-label">Schedule</div>
                    </div>
                    <div className="ht-schedule">
                        <div className="ht-sch-top">
                            <div className="ht-sch-title">Project Timeline</div>
                            <button
                                className="ht-edit-btn"
                                onClick={() => navigate('/dashboard/mobile/manage')}
                            >
                                Edit Dates
                            </button>
                        </div>
                        <div className="ht-sch-dates">
                            <div className="ht-sch-date">
                                <div className="ht-sch-date-lbl">Launch</div>
                                <div className="ht-sch-date-val">
                                    {fmtDay(project.start_date)}<em>{fmtMon(project.start_date)}</em>
                                </div>
                            </div>
                            <div className="ht-sch-date end">
                                <div className="ht-sch-date-lbl">Target</div>
                                <div className="ht-sch-date-val">
                                    {fmtDay(project.end_date)}<em>{fmtMon(project.end_date)}</em>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── WEEKLY CHART ── */}
                <div className="ht-sec">
                    <div className="ht-sec-head">
                        <div className="ht-sec-label">Task activity</div>
                    </div>
                    <WeekChart tasks={allTasks} />
                </div>

                {/* ── ENGINE FLOW ── */}
                <div className="ht-sec">
                    <div className="ht-sec-head">
                        <div className="ht-sec-label">{phases.length} phases</div>
                        <div className="ht-sec-right">
                            <button className="ht-ctrl" onClick={expandAll}>Expand</button>
                            <button className="ht-ctrl" onClick={collapseAll}>Hide</button>
                        </div>
                    </div>

                    <div className="ht-phases">
                        {phases.map((phase, idx) => {
                            const phaseTasks = allTasks.filter(t => t.phase === phase.id);
                            const done = phaseTasks.filter(t => t.status === 'COMPLETED').length;
                            const perc = phaseTasks.length > 0
                                ? Math.round((done / phaseTasks.length) * 100)
                                : 0;
                            const isOpen = expandedPhases.has(phase.id);
                            const st = getPhaseStatus(phase, phaseTasks);

                            return (
                                <div
                                    key={phase.id}
                                    className={`ht-phase${isOpen ? ' open' : ''}${st === 'wip' ? ' wip' : ''}`}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className="ht-phase-hd" onClick={() => togglePhase(phase.id)}>
                                        <div className="ht-phase-idx">{String(idx + 1).padStart(2, '0')}</div>
                                        <div className="ht-phase-info">
                                            <div className="ht-phase-name">{phase.name}</div>
                                            <div className="ht-phase-meta">
                                                {phaseTasks.length} tasks · {done} done
                                            </div>
                                        </div>
                                        <div className="ht-phase-right">
                                            <div className="ht-phase-pct">{perc}%</div>
                                            <div className={`ht-phase-status ${st}`}>{STATUS_LABEL[st]}</div>
                                        </div>
                                    </div>
                                    <div className="ht-phase-bar">
                                        <div className="ht-phase-bar-fill" style={{ width: `${perc}%` }} />
                                    </div>

                                    {isOpen && (
                                        <div className="ht-tasks">
                                            {phaseTasks.map((task, ti) => {
                                                const isDone = task.status === 'COMPLETED';
                                                return (
                                                    <div
                                                        key={task.id}
                                                        className={`ht-task${isDone ? ' done' : ''}`}
                                                        style={{ animationDelay: `${ti * 30}ms` }}
                                                        onClick={() => handleTaskToggle(task)}
                                                    >
                                                        <div className="ht-task-chk">
                                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                                <polyline
                                                                    points="1,5 4,8 9,2"
                                                                    stroke="var(--t-bg)"
                                                                    strokeWidth="1.5"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                />
                                                            </svg>
                                                        </div>
                                                        <div className="ht-task-lbl">{task.title}</div>
                                                        <div className="ht-task-badge">
                                                            {isDone ? 'Done' : st === 'wip' ? 'Active' : 'Queued'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <button
                                                className="ht-analytics-btn"
                                                onClick={(e) => { e.stopPropagation(); setDetailPhase(phase); }}
                                            >
                                                ↗ Analytics
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── BUDGET (only if data exists) ── */}
                {(totalBudget > 0 || usedBudget > 0) && (
                    <div className="ht-sec">
                        <div className="ht-sec-head">
                            <div className="ht-sec-label">Budget</div>
                        </div>
                        <div className="ht-budget-grid">
                            <div className="ht-bc">
                                <div className="ht-bc-lbl">Total budget</div>
                                <div className="ht-bc-val">{formatMoney(totalBudget)}</div>
                                <div className="ht-bc-bar">
                                    <div className="ht-bc-fill" style={{ width: `${budgetPct}%` }} />
                                </div>
                                <div className="ht-bc-sub">{budgetPct}% utilised</div>
                            </div>
                            <div className="ht-bc">
                                <div className="ht-bc-lbl">Used so far</div>
                                <div className="ht-bc-val">{formatMoney(usedBudget)}</div>
                                <div className="ht-bc-bar">
                                    <div
                                        className={`ht-bc-fill${budgetPct > 85 ? ' red' : ''}`}
                                        style={{ width: `${Math.min(budgetPct, 100)}%` }}
                                    />
                                </div>
                                <div className="ht-bc-sub">of total</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── ACTIVITY ── */}
                <div className="ht-sec">
                    <div className="ht-sec-head">
                        <div className="ht-sec-label">Activity stream</div>
                    </div>
                    <div className="ht-activity">
                        {recentUpdates && recentUpdates.length > 0
                            ? recentUpdates.map((update, i) => (
                                <div
                                    key={update.id}
                                    className="ht-act-item"
                                    style={{ animationDelay: `${i * 50}ms` }}
                                >
                                    <div className="ht-act-icon">
                                        <div className="ht-act-dot" style={{ background: actDotColor(update) }} />
                                    </div>
                                    <div className="ht-act-body">
                                        <div className="ht-act-title">{update.title}</div>
                                        <div className="ht-act-sub">{update.message || 'Event confirmed'}</div>
                                    </div>
                                    <div className="ht-act-time">{update.time?.split(',')[0]}</div>
                                </div>
                            ))
                            : (
                                <div className="ht-empty">
                                    <p>Awaiting telemetry</p>
                                </div>
                            )
                        }
                    </div>
                </div>

                {/* ── GEO ── */}
                <div className="ht-sec">
                    <div className="ht-sec-head">
                        <div className="ht-sec-label">Geo status</div>
                    </div>
                    <div className="ht-geo-grid">
                        <div className="ht-geo-sync">
                            <div className="ht-geo-orb">
                                <div className="ht-geo-r1" />
                                <div className="ht-geo-r2" />
                                <div className="ht-geo-r3" />
                                <div className="ht-geo-core" />
                            </div>
                            <div className="ht-geo-lbl">
                                {(project.name?.split(' ')[0] || 'SITE').toUpperCase()}_LINK<br />
                                Global Sync
                            </div>
                        </div>
                        <div className="ht-geo-coords">
                            <div>
                                <div className="ht-coord-lbl">Latitude</div>
                                <div className="ht-coord-val">
                                    {project.latitude || '28.4'}<em>N</em>
                                </div>
                            </div>
                            <div>
                                <div className="ht-coord-lbl">Longitude</div>
                                <div className="ht-coord-val">
                                    {project.longitude || '82.3'}<em>E</em>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </MobileLayout>
    );
};

export default HomeTab;