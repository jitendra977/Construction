import React from 'react';
import { useNavigate } from 'react-router-dom';

const AboutDeveloper = () => {
    const navigate = useNavigate();

    const skills = [
        { name: 'Full Stack Development', icon: '💻', level: 'Expert' },
        { name: 'React & Modern UI/UX', icon: '🎨', level: 'Senior' },
        { name: 'Django & Python Backend', icon: '🐍', level: 'Expert' },
        { name: 'Database Architecture', icon: '🗄️', level: 'Advanced' },
        { name: 'DevOps & Deployment', icon: '🚀', level: 'Advanced' },
        { name: 'System Security', icon: '🔒', level: 'Expert' },
    ];

    const stats = [
        { label: 'Experience', value: '5+ Years' },
        { label: 'Projects', value: '50+' },
        { label: 'Commits', value: '10k+' },
        { label: 'Rating', value: '5.0 ⭐' },
    ];

    return (
        <div className="min-h-screen overflow-y-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700" 
             style={{ background: 'var(--t-bg)', color: 'var(--t-text)' }}>
            
            {/* Header / Back Button */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-3 rounded-2xl transition-all hover:scale-110 active:scale-95 border"
                    style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)', color: 'var(--t-primary)' }}
                >
                    ← Back
                </button>
                <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--t-text)' }}>
                    About The <span style={{ color: 'var(--t-primary)' }}>Developer</span>
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1 p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden group h-fit"
                     style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border2)' }}>
                    
                    {/* Background Glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none"
                         style={{ background: 'var(--t-primary)' }} />
                    
                    <div className="flex flex-col items-center text-center relative z-10">
                        <div className="w-48 h-48 rounded-[2rem] overflow-hidden border-4 shadow-2xl mb-6 transform transition-transform group-hover:scale-105 duration-500"
                             style={{ borderColor: 'var(--t-primary)' }}>
                            <img src="/jitendra.png" alt="Jitendra Khadka" className="w-full h-full object-cover" />
                        </div>
                        
                        <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--t-text)' }}>Jitendra Khadka</h2>
                        <p className="text-sm font-bold uppercase tracking-widest mb-6" style={{ color: 'var(--t-primary)' }}>
                            Full Stack Engineer & Visionary
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 w-full">
                            {stats.map((stat, i) => (
                                <div key={i} className="p-3 rounded-2xl border" 
                                     style={{ background: 'color-mix(in srgb, var(--t-primary) 5%, transparent)', borderColor: 'var(--t-border)' }}>
                                    <p className="text-xl font-black" style={{ color: 'var(--t-primary)' }}>{stat.value}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-tighter opacity-70">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex gap-4">
                            <button className="flex-1 px-6 py-3 rounded-xl font-bold transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
                                    style={{ background: 'var(--t-primary)', color: 'var(--t-primary-btn-text)' }}>
                                <span>📧</span> Contact
                            </button>
                            <button className="px-6 py-3 rounded-xl border font-bold transition-all hover:bg-white/5 active:scale-95"
                                    style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}>
                                🔗 Portfolio
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Bio Section */}
                    <div className="p-8 rounded-[2.5rem] border shadow-xl"
                         style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                        <h3 className="text-xl font-black mb-4 flex items-center gap-3">
                            <span className="text-2xl">✍️</span> Personal Bio
                        </h3>
                        <p className="text-[var(--t-text2)] leading-relaxed text-lg font-medium italic">
                            "Passionate about building software that solves real-world problems. With a deep focus on user experience and robust architecture, I transform complex requirements into elegant, high-performance applications."
                        </p>
                        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--t-border)' }}>
                            <p className="text-[var(--t-text2)] text-base">
                                Dedicated to pushing the boundaries of what's possible in web and mobile development. Expert in the MERN/PERN stack and Python/Django ecosystem. Currently focused on building intelligent construction management systems that empower local engineers and house owners.
                            </p>
                        </div>
                    </div>

                    {/* Skills Grid */}
                    <div>
                        <h3 className="text-xl font-black mb-6 px-4 flex items-center gap-3">
                            <span className="text-2xl">🛠️</span> Core Expertise
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {skills.map((skill, i) => (
                                <div key={i} className="p-4 rounded-2xl border flex items-center gap-4 transition-all hover:translate-x-2"
                                     style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner"
                                         style={{ background: 'color-mix(in srgb, var(--t-primary) 10%, transparent)' }}>
                                        {skill.icon}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-sm" style={{ color: 'var(--t-text)' }}>{skill.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 h-1.5 rounded-full bg-black/20 overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-1000" 
                                                     style={{ background: 'var(--t-primary)', width: skill.level === 'Expert' ? '95%' : skill.level === 'Senior' ? '85%' : '75%' }} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{skill.level}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mission Quote */}
                    <div className="p-8 rounded-[2.5rem] border text-center relative overflow-hidden"
                         style={{ background: 'linear-gradient(135deg, var(--t-primary), #000)', borderColor: 'var(--t-primary)' }}>
                        <div className="relative z-10">
                            <h2 className="text-2xl md:text-3xl font-black text-white italic mb-2 tracking-tighter">
                                "Code is like humor. When you have to explain it, it’s bad."
                            </h2>
                            <p className="text-white/70 font-bold uppercase tracking-widest text-sm">— Cory House</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutDeveloper;
