import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AboutDeveloper = () => {
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState('overview');
    const [terminalInput, setTerminalInput] = useState('');
    const [terminalHistory, setTerminalHistory] = useState([
        { type: 'input', text: 'neofetch' },
        { type: 'output', text: 'OS: Alpine Linux 3.19.1 | Kernel: 6.1.77 | Shell: zsh | Editor: Neovim' },
        { type: 'output', text: 'Type "help" for a list of available CLI commands.' }
    ]);

    // Mock Contribution Map: 7 rows x 36 columns
    const generateContributionMap = () => {
        const levels = [0, 0, 1, 0, 2, 0, 0, 3, 1, 0, 4, 1, 2, 0, 1, 0, 3, 0, 2, 1, 0, 1, 4, 0, 0, 2, 1, 3, 0, 0, 1, 2, 0, 0, 1, 3, 0, 2, 4, 0];
        const grid = [];
        for (let r = 0; r < 7; r++) {
            const row = [];
            for (let c = 0; c < 36; c++) {
                const index = (r * 36 + c) % levels.length;
                row.push(levels[index]);
            }
            grid.push(row);
        }
        return grid;
    };

    const contributionGrid = generateContributionMap();

    const techBadges = {
        frontend: [
            { name: 'React 19', bg: '#61DAFB' },
            { name: 'Vite', bg: '#646CFF' },
            { name: 'Tailwind CSS', bg: '#06B6D4' },
            { name: 'PWA / Service Workers', bg: '#5A0FC8' },
        ],
        backend: [
            { name: 'Python & Django REST', bg: '#092E20' },
            { name: 'WebSockets & Channels', bg: '#FF6600' },
            { name: 'PostgreSQL', bg: '#4169E1' },
            { name: 'MQTT Broker Protocols', bg: '#660066' },
        ],
        devops: [
            { name: 'Docker Containers', bg: '#2496ED' },
            { name: 'Nginx Reverse Proxy', bg: '#009639' },
            { name: 'GitHub Actions CI/CD', bg: '#2088FF' },
        ]
    };

    const pinnedRepos = [
        { name: 'Construction', desc: 'Enterprise Construction Management System (HCMS) featuring live biometrics, deep phase financial ledgers, and workforce sync.', lang: 'React / Python', stars: 8, forks: 3 },
        { name: 'didan_pos', desc: 'Real-time retail Point of Sale (POS) mobile application developed in Flutter / Dart.', lang: 'Dart', stars: 1, forks: 0 },
        { name: 'mysite', desc: 'Professional web application and back-end API suite built using the Django REST Framework.', lang: 'Python', stars: 4, forks: 2 },
        { name: 'Cashbook-app', desc: 'A clean transaction ledger and cash diary application to record and track daily debit/credit records.', lang: 'JavaScript', stars: 1, forks: 0 },
        { name: 'restaurantpos', desc: 'Responsive Point of Sale (POS) visual dashboard layout for restaurant management.', lang: 'CSS / JS', stars: 3, forks: 1 },
        { name: 'pos-frontend-vite', desc: 'Ultra-fast point-of-sale client dashboard compiled using Vite and React.', lang: 'JavaScript', stars: 2, forks: 0 },
        { name: 'studentmanagement', desc: 'Java-based database application designed for educational administration and student records.', lang: 'Java', stars: 2, forks: 0 },
        { name: 'TextUtils', desc: 'Custom Django-powered tool for analyzing, processing, and formatting raw text datasets.', lang: 'Python / HTML', stars: 1, forks: 0 },
        { name: 'home_server', desc: 'Custom scripts, tools, and visual layouts serving home networking utilities.', lang: 'CSS / HTML', stars: 1, forks: 0 },
        { name: 'pi-server', desc: 'Telemetry host system scripts managing Raspberry Pi telemetry endpoints and server diagnostics.', lang: 'Python', stars: 2, forks: 0 },
        { name: 'nishana_pos', desc: 'Advanced POS deployment makefile automation and compilation scripts.', lang: 'Makefile', stars: 0, forks: 0 },
        { name: 'E-mapp1.0', desc: 'Interactive digital mapping layouts and utility interfaces.', lang: 'CSS', stars: 0, forks: 0 },
    ];

    const systemInfo = [
        { label: 'OS', value: 'macOS / Linux Server' },
        { label: 'Shell', value: 'zsh / bash' },
        { label: 'Editor', value: 'Neovim / VSCode' },
        { label: 'Theme', value: 'Custom Dark-Glass' },
        { label: 'Font', value: 'Fira Code / JetBrains Mono' },
    ];

    const handleTerminalSubmit = (e) => {
        e.preventDefault();
        const cmd = terminalInput.trim().toLowerCase();
        if (!cmd) return;

        let response = '';
        if (cmd === 'help') {
            response = 'Available commands: help, neofetch, clear, skills, bio, contact';
        } else if (cmd === 'neofetch') {
            response = 'OS: Alpine Linux 3.19.1 | CPU: AMD EPYC (8 cores) | RAM: 16 GB DDR5 | Uptime: 247 days';
        } else if (cmd === 'clear') {
            setTerminalHistory([]);
            setTerminalInput('');
            return;
        } else if (cmd === 'skills') {
            response = 'Backend: Python, Django, REST, WebSockets, Channels, MQTT | Frontend: React, Redux, Tailwind, PWAs | DevOps: Docker, Nginx, AWS, CI/CD';
        } else if (cmd === 'bio') {
            response = 'Full Stack Engineer focusing on secure, ultra-robust real-time web applications and live sync mechanisms.';
        } else if (cmd === 'contact') {
            response = 'Email: jitendrakhadka.np@gmail.com | Github: github.com/jitendra977';
        } else {
            response = `zsh: command not found: ${cmd}. Type "help" for a list of commands.`;
        }

        setTerminalHistory(prev => [
            ...prev,
            { type: 'input', text: terminalInput },
            { type: 'output', text: response }
        ]);
        setTerminalInput('');
    };

    return (
        <div className="min-h-screen overflow-y-auto w-full"
             style={{ background: 'var(--t-bg)', color: 'var(--t-text)', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" }}>
            
            {/* Top Minimal Navigation Bar */}
            <div className="border-b" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface)' }}>
                <div className="max-w-[1280px] mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate(-1)}
                            className="px-3 py-1 rounded-md text-xs font-semibold transition-all border flex items-center gap-1.5"
                            style={{ background: 'var(--t-surface2)', borderColor: 'var(--t-border)', color: 'var(--t-text2)' }}
                        >
                            <span>←</span> back
                        </button>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--t-text2)]">
                            <span className="font-bold text-[var(--t-text)]">github.com</span>
                            <span>/</span>
                            <span className="font-bold text-[var(--t-text)]">jitendra977</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-500">Active Now</span>
                    </div>
                </div>
            </div>

            {/* Main Center Container */}
            <div className="max-w-[1280px] mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    
                    {/* Left Column: Avatar and User Profile Metadata */}
                    <div className="md:col-span-1 space-y-4">
                        {/* Avatar Frame */}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                            <div className="relative w-full aspect-square rounded-full overflow-hidden border-4" style={{ borderColor: 'var(--t-border)' }}>
                                <img src="/jitendra.png" alt="Jitendra Khadka" className="w-full h-full object-cover" />
                            </div>
                        </div>

                        {/* Name Titles */}
                        <div className="pt-2">
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--t-text)]">Jitendra Khadka</h1>
                            <p className="text-sm text-[var(--t-text3)] font-mono">jitendra977</p>
                        </div>

                        {/* Bio Text */}
                        <p className="text-xs text-[var(--t-text2)] leading-relaxed pt-1">
                            Building premium digital experiences with Python/Django, reactive interfaces, and deep real-time sync systems. Lead developer of this Construction Management System.
                        </p>

                        {/* Outline Follow/Edit Button */}
                        <button className="w-full py-1.5 border rounded-md text-xs font-semibold hover:opacity-90 transition-opacity" style={{ background: 'var(--t-surface2)', borderColor: 'var(--t-border)', color: 'var(--t-text2)' }}>
                            Follow
                        </button>

                        {/* Contact details */}
                        <div className="space-y-2 pt-3 border-t text-[11px] text-[var(--t-text2)]" style={{ borderColor: 'var(--t-border)' }}>
                            <div className="flex items-center gap-2">
                                <span>👥</span>
                                <span className="font-bold">148</span> followers · <span className="font-bold">290</span> following
                            </div>
                            <div className="flex items-center gap-2">
                                <span>📍</span>
                                <span>Kathmandu, Nepal</span>
                            </div>
                            <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                                <span>📧</span>
                                <a href="mailto:jitendrakhadka.np@gmail.com" className="hover:underline color-[var(--t-primary)]">jitendrakhadka.np@gmail.com</a>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>🔗</span>
                                <a href="https://github.com/jitendra977" target="_blank" rel="noreferrer" className="hover:underline">github.com/jitendra977</a>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Interactive Tabs, README, Grid and Stats */}
                    <div className="md:col-span-3 space-y-6">
                        {/* GitHub Tabs Bar */}
                        <div className="flex gap-4 border-b text-xs pb-0.5" style={{ borderColor: 'var(--t-border)' }}>
                            <button 
                                onClick={() => setSelectedTab('overview')}
                                className={`pb-3 px-1 font-semibold flex items-center gap-1.5 border-b-2 transition-all ${selectedTab === 'overview' ? 'border-[var(--t-primary)] text-[var(--t-text)] font-bold' : 'border-transparent text-[var(--t-text3)] hover:text-[var(--t-text)]'}`}
                            >
                                📖 Overview
                            </button>
                            <button 
                                onClick={() => setSelectedTab('diagnostics')}
                                className={`pb-3 px-1 font-semibold flex items-center gap-1.5 border-b-2 transition-all ${selectedTab === 'diagnostics' ? 'border-[var(--t-primary)] text-[var(--t-text)]' : 'border-transparent text-[var(--t-text3)] hover:text-[var(--t-text)]'}`}
                            >
                                💻 Interactive CLI
                            </button>
                        </div>

                        {selectedTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Content Grid: README and Repos */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Profile Readme File */}
                                    <div className="border rounded-lg p-5" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                                        <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: 'var(--t-border)' }}>
                                            <span className="text-xs font-bold text-[var(--t-text2)] font-mono">README.md</span>
                                            <span className="text-[10px] text-[var(--t-text3)] font-mono">markdown</span>
                                        </div>
                                        
                                        <div className="space-y-4 text-xs leading-relaxed text-[var(--t-text2)]">
                                            <div>
                                                <h3 className="text-sm font-bold text-[var(--t-text)] mb-2">⚡ Quick Bio</h3>
                                                <p className="italic pl-3 border-l-2 border-[var(--t-primary)] text-[var(--t-text)]">
                                                    "Simplicity is the soul of modern design. I dedicate my efforts toward crafting flawless UX architectures integrated with ultra-robust backend systems."
                                                </p>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-bold text-[var(--t-text)] mb-2">🔭 Current Projects</h3>
                                                <ul className="list-disc list-inside pl-1 space-y-1">
                                                    <li><strong className="text-[var(--t-text)]">HCMS Dashboard</strong>: Collapsible real-time dashboard with biometric controls.</li>
                                                    <li><strong className="text-[var(--t-text)]">Worker Portal WebApp</strong>: Mobile-first offline-capable biometric client.</li>
                                                </ul>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-bold text-[var(--t-text)] mb-2">🛠️ Technical Stack</h3>
                                                <div className="space-y-3 pt-1">
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider block text-[var(--t-text3)] mb-1.5">Frontend Rails</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {techBadges.frontend.map((badge, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${badge.bg}22`, color: badge.bg, border: `1px solid ${badge.bg}44` }}>
                                                                    {badge.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider block text-[var(--t-text3)] mb-1.5">Backend & LiveSync</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {techBadges.backend.map((badge, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${badge.bg}22`, color: badge.bg, border: `1px solid ${badge.bg}44` }}>
                                                                    {badge.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-[var(--t-text)] px-1 uppercase tracking-wider">📌 Pinned Repositories</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {pinnedRepos.map((repo, idx) => (
                                                <div key={idx} className="border rounded-lg p-4 flex flex-col justify-between space-y-3 hover:shadow-sm transition-shadow" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                                                    <div>
                                                        <div className="flex items-center justify-between">
                                                            <a 
                                                                href={`https://github.com/jitendra977/${repo.name}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs font-bold text-[var(--t-primary)] hover:underline"
                                                            >
                                                                {repo.name}
                                                            </a>
                                                            <span className="text-[9px] border px-1.5 py-0.5 rounded text-[var(--t-text3)]" style={{ borderColor: 'var(--t-border)' }}>Public</span>
                                                        </div>
                                                        <p className="text-[11px] text-[var(--t-text2)] mt-2 leading-relaxed">{repo.desc}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-[10px] text-[var(--t-text3)]">
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: repo.lang === 'Python' ? '#3776AB' : repo.lang === 'JavaScript' ? '#F7DF1E' : repo.lang === 'Go' ? '#00ADD8' : '#61DAFB' }} />
                                                            {repo.lang}
                                                        </span>
                                                        <span>⭐ {repo.stars}</span>
                                                        <span>🍴 {repo.forks}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Contribution Grid */}
                                    <div className="border rounded-lg p-5" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold">2,492 contributions in the last year</span>
                                            <span className="text-[10px] text-[var(--t-text3)]">contribution settings</span>
                                        </div>
                                        
                                        <div className="overflow-x-auto">
                                            <div className="min-w-[480px] flex flex-col gap-[3px]">
                                                {contributionGrid.map((row, rIdx) => (
                                                    <div key={rIdx} className="flex gap-[3px]">
                                                        {row.map((val, cIdx) => {
                                                            let bg = 'var(--t-border)';
                                                            if (val === 1) bg = 'color-mix(in srgb, var(--t-primary) 25%, transparent)';
                                                            else if (val === 2) bg = 'color-mix(in srgb, var(--t-primary) 50%, transparent)';
                                                            else if (val === 3) bg = 'color-mix(in srgb, var(--t-primary) 75%, transparent)';
                                                            else if (val === 4) bg = 'var(--t-primary)';
                                                            return (
                                                                <span 
                                                                    key={cIdx} 
                                                                    className="w-[10px] h-[10px] rounded-[1.5px] flex-shrink-0 transition-colors hover:scale-110" 
                                                                    style={{ backgroundColor: bg }}
                                                                    title={`${val * 2} commits`}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center mt-3 text-[10px] text-[var(--t-text3)]">
                                            <span>Learn how we count contributions</span>
                                            <div className="flex items-center gap-1.5">
                                                <span>Less</span>
                                                <span className="w-2.5 h-2.5 rounded-[1.5px]" style={{ background: 'var(--t-border)' }} />
                                                <span className="w-2.5 h-2.5 rounded-[1.5px]" style={{ background: 'color-mix(in srgb, var(--t-primary) 25%, transparent)' }} />
                                                <span className="w-2.5 h-2.5 rounded-[1.5px]" style={{ background: 'color-mix(in srgb, var(--t-primary) 50%, transparent)' }} />
                                                <span className="w-2.5 h-2.5 rounded-[1.5px]" style={{ background: 'color-mix(in srgb, var(--t-primary) 75%, transparent)' }} />
                                                <span className="w-2.5 h-2.5 rounded-[1.5px]" style={{ background: 'var(--t-primary)' }} />
                                                <span>More</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Stats Sidebar Grid */}
                                <div className="space-y-6">
                                    {/* Stats Card */}
                                    <div className="border rounded-lg p-5" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--t-text3)] mb-4">GitHub Stats</h3>
                                        <div className="space-y-3.5 text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[var(--t-text2)]">⭐ Stars received</span>
                                                <span className="font-bold text-[var(--t-text)]">840</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[var(--t-text2)]">📦 Total commits</span>
                                                <span className="font-bold text-[var(--t-text)]">10,482</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[var(--t-text2)]">🍴 Total forks</span>
                                                <span className="font-bold text-[var(--t-text)]">192</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[var(--t-text2)]">🔥 Contribution rate</span>
                                                <span className="font-bold text-emerald-500">98.4%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Language Stack Focus */}
                                    <div className="border rounded-lg p-5" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--t-text3)] mb-3">Development Focus</h3>
                                        <div className="space-y-3 text-xs">
                                            <div>
                                                <div className="flex justify-between mb-1.5">
                                                    <span className="text-[var(--t-text2)]">Python / Django Backend</span>
                                                    <span className="font-bold">45%</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-black/20 overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ background: '#3776AB', width: '45%' }} />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between mb-1.5">
                                                    <span className="text-[var(--t-text2)]">React / Frontend / UI</span>
                                                    <span className="font-bold">35%</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-black/20 overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ background: '#61DAFB', width: '35%' }} />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between mb-1.5">
                                                    <span className="text-[var(--t-text2)]">SQL & DevOps / Channels</span>
                                                    <span className="font-bold">20%</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-black/20 overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ background: '#FF6600', width: '20%' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Interactive Terminal System Tab */}
                        {selectedTab === 'diagnostics' && (
                            <div className="border rounded-lg p-5 space-y-6" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--t-border)' }}>
                                    <span className="text-xs font-bold text-[var(--t-text2)]">Interactive Terminal Shell Simulator</span>
                                    <span className="text-[10px] font-bold text-emerald-500">live connection</span>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* System Specifications */}
                                    <div className="space-y-4 lg:col-span-1">
                                        <h3 className="text-sm font-bold text-[var(--t-primary)]">System Config</h3>
                                        <div className="space-y-2 text-xs">
                                            {systemInfo.map((info, idx) => (
                                                <div key={idx} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: 'var(--t-border)' }}>
                                                    <span className="text-[var(--t-text3)]">{info.label}</span>
                                                    <span className="font-bold text-[var(--t-text)]">{info.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Interactive CLI Console */}
                                    <div className="lg:col-span-2 flex flex-col h-[340px] rounded-lg font-mono text-xs border overflow-hidden shadow-2xl" style={{ backgroundColor: '#0c0f12', borderColor: 'var(--t-border)' }}>
                                        {/* Window Header */}
                                        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ backgroundColor: '#161b22', borderColor: '#21262d' }}>
                                            <div className="flex gap-2">
                                                <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                                                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                                                <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                                            </div>
                                            <span className="text-[10px] text-[#8b949e] font-semibold">zsh — jitendra@hcms-server</span>
                                        </div>
                                        
                                        {/* History */}
                                        <div className="flex-1 p-4 overflow-y-auto space-y-2">
                                            {terminalHistory.map((item, idx) => (
                                                <div key={idx}>
                                                    {item.type === 'input' ? (
                                                        <p className="text-[#c9d1d9]">
                                                            <span className="text-[#238636] font-bold">jitendra@hcms:~$</span> {item.text}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[#8b949e] pl-3 border-l-2 border-[#30363d] whitespace-pre-wrap leading-relaxed">
                                                            {item.text}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Prompt Input Form */}
                                        <form onSubmit={handleTerminalSubmit} className="flex items-center px-4 py-3 border-t bg-[#090c0f]" style={{ borderColor: '#21262d' }}>
                                            <span className="text-[#2ea043] font-bold mr-2">jitendra@hcms:~$</span>
                                            <input 
                                                type="text" 
                                                value={terminalInput}
                                                onChange={(e) => setTerminalInput(e.target.value)}
                                                className="flex-1 bg-transparent border-none outline-none text-[#f0f6fc] focus:ring-0 p-0"
                                                style={{ caretColor: '#2ea043' }}
                                                placeholder="type 'help'..."
                                                autoFocus
                                            />
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutDeveloper;
