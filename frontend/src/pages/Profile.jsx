import React, { useState } from 'react';
import { useConstruction } from '../context/ConstructionContext';
import { User, Mail, Shield, Phone, MapPin, Info, Bell, Settings, Camera, Save, Activity, Type, RotateCcw, Edit2, Loader2, X } from 'lucide-react';
import { mediaUrl } from '../services/createApiClient';
import { Link } from 'react-router-dom';
import MobileLayout from '../components/mobile/MobileLayout';

const Profile = () => {
    const [isMobile] = useState(window.innerWidth < 1024);
    const { user, updateProfile, typography, updateTypography, resetTypography } = useConstruction();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeStyleTab, setActiveStyleTab] = useState('title');
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        bio: user?.bio || '',
        phone_number: user?.phone_number || '',
        address: user?.address || '',
        preferred_language: user?.preferred_language || 'en',
        notifications_enabled: user?.notifications_enabled ?? true,
        profile_image: null
    });
    const [previewUrl, setPreviewUrl] = useState(null);

    if (!user) return null;

    const avatarUrl = previewUrl || mediaUrl(user.profile_image);
    const roleName = user.role?.name || 'Admin';

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, profile_image: file }));
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const result = await updateProfile(formData);
            if (result.success) {
                setIsEditModalOpen(false);
                setPreviewUrl(null);
            }
        } catch (error) {
            console.error("Update error", error);
        } finally {
            setSaving(false);
        }
    };

    const content = (
        <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Banner */}
            <div className="relative mb-16">
                <div className="h-48 bg-gradient-to-tr from-blue-900 via-[#0d1117] to-blue-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-[var(--t-border)]">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>
                </div>

                <div className="absolute -bottom-10 left-8 flex items-end gap-6">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-3xl bg-[var(--t-surface)] p-1.5 shadow-2xl overflow-hidden relative border border-[var(--t-border)] transition-transform duration-500 group-hover:scale-105">
                            {user.profile_image || previewUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={user.username}
                                    className="w-full h-full object-cover rounded-2xl"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        e.target.parentNode.innerHTML = `<div class="w-full h-full rounded-2xl bg-[var(--t-surface2)] flex items-center justify-center text-4xl font-black text-[var(--t-primary)]">${user.username?.charAt(0).toUpperCase()}</div>`;
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full rounded-2xl bg-[var(--t-surface2)] flex items-center justify-center text-4xl font-black text-[var(--t-primary)]">
                                    {user.username?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <button onClick={() => setIsEditModalOpen(true)} className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 gap-2">
                                <Camera className="text-white w-8 h-8" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white">Update Avatar</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="pb-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 rounded-full bg-[var(--t-primary)]/10 text-[var(--t-primary)] border border-[var(--t-primary)]/20">
                            <Shield className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{roleName}</span>
                        </div>
                        <h1 className="text-4xl font-black text-[var(--t-text)] tracking-tight leading-none drop-shadow-md">
                            {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                        </h1>
                        <p className="text-[var(--t-text3)] text-sm font-medium mt-2 max-w-md line-clamp-2">
                            {user.bio || 'Construction professional managing site operations and logistics.'}
                        </p>
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute bottom-4 right-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:scale-105"
                >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
                {/* ── Left Column: Intel & Config ── */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Basic Intel */}
                    <div className="bg-[var(--t-surface)] rounded-[2rem] p-8 border border-[var(--t-border)] shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[50px] group-hover:bg-blue-500/10 transition-colors"></div>
                        <h2 className="text-sm font-black text-[var(--t-text)] mb-6 flex items-center gap-3 uppercase tracking-widest relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Info className="w-4 h-4" />
                            </div>
                            Contact Intel
                        </h2>
                        <div className="space-y-5 relative z-10">
                            {[
                                { label: 'System Email', value: user.email, icon: <Mail className="w-4 h-4" /> },
                                { label: 'Direct Line', value: user.phone_number || 'Unassigned', icon: <Phone className="w-4 h-4" /> },
                                { label: 'Base Location', value: user.address || 'Unassigned', icon: <MapPin className="w-4 h-4" /> }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 items-start">
                                    <div className="text-[var(--t-text3)] mt-0.5">{item.icon}</div>
                                    <div className="space-y-0.5 min-w-0">
                                        <p className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">{item.label}</p>
                                        <p className="text-[13px] font-bold text-[var(--t-text)] truncate">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Config */}
                    <div className="bg-[var(--t-surface)] rounded-[2rem] p-8 border border-[var(--t-border)] shadow-xl">
                        <h2 className="text-sm font-black text-[var(--t-text)] mb-6 flex items-center gap-3 uppercase tracking-widest">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <Settings className="w-4 h-4" />
                            </div>
                            System Preferences
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-[var(--t-surface2)] rounded-2xl border border-[var(--t-border)]">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-black text-[var(--t-text)] block">Push Notifications</span>
                                    <span className="text-[10px] text-[var(--t-text3)] font-medium">Alerts for task updates</span>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${user.notifications_enabled ? 'bg-blue-600' : 'bg-gray-600'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${user.notifications_enabled ? 'left-7' : 'left-1'}`} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-[var(--t-surface2)] rounded-2xl border border-[var(--t-border)]">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-black text-[var(--t-text)] block">Interface Language</span>
                                    <span className="text-[10px] text-[var(--t-text3)] font-medium">System locale setting</span>
                                </div>
                                <span className="px-3 py-1 rounded-lg bg-[var(--t-surface)] border border-[var(--t-border)] text-[10px] font-black text-blue-500 uppercase tracking-wider">
                                    {user.preferred_language === 'en' ? 'English' : 'Nepali'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Audit Logs Link */}
                    <Link to="../activity-logs" className="group flex items-center justify-between p-6 bg-[var(--t-surface)] rounded-[2rem] border border-[var(--t-border)] hover:border-blue-500/50 transition-colors shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-500 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-[var(--t-text)] uppercase tracking-wider">Audit Trail</h3>
                                <p className="text-[10px] text-[var(--t-text3)] font-medium mt-0.5">View your activity history</p>
                            </div>
                        </div>
                        <div className="text-[var(--t-text3)] group-hover:text-blue-500 transition-transform group-hover:translate-x-1">→</div>
                    </Link>
                </div>

                {/* ── Right Column: Typography Style Lab ── */}
                <div className="lg:col-span-8">
                    <div className="bg-[var(--t-surface)] rounded-[2.5rem] p-8 lg:p-10 border border-[var(--t-border)] shadow-xl h-full flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                            <div>
                                <h2 className="text-xl font-black text-[var(--t-text)] flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                        <Type className="w-5 h-5" />
                                    </div>
                                    Typography Matrix
                                </h2>
                                <p className="text-[var(--t-text3)] text-sm font-medium mt-2">Fine-tune the application's visual hierarchy.</p>
                            </div>
                            <button 
                                onClick={resetTypography}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--t-surface2)] text-[var(--t-text)] text-[10px] font-black rounded-xl border border-[var(--t-border)] uppercase tracking-widest hover:bg-[var(--t-border)] transition-all"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Restore Defaults
                            </button>
                        </div>
                        
                        {/* Tab Navigation */}
                        <div className="flex gap-2 bg-[var(--t-surface2)] p-1.5 rounded-2xl mb-10 overflow-x-auto scrollbar-none">
                            {['title', 'subtitle', 'header', 'body'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveStyleTab(tab)}
                                    className={`flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeStyleTab === tab ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'text-[var(--t-text3)] hover:text-[var(--t-text)] hover:bg-[var(--t-surface)]'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" key={activeStyleTab}>
                            {/* Font Family */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Target Typeface</label>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    {['Space Grotesk', 'JetBrains Mono', 'Inter', 'Outfit', 'Roboto'].map(font => (
                                        <button 
                                            key={font}
                                            onClick={() => updateTypography(activeStyleTab, { family: font })}
                                            className={`py-4 px-2 rounded-2xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center gap-1 ${typography[activeStyleTab].family === font ? 'bg-purple-600/10 text-purple-500 border-purple-500 shadow-md' : 'bg-[var(--t-surface2)] text-[var(--t-text)] border-[var(--t-border)] hover:border-purple-500/50'}`}
                                            style={{ fontFamily: font }}
                                        >
                                            <span className="text-2xl mb-1" style={{ fontFamily: font }}>Ag</span>
                                            <span className="truncate w-full text-center">{font.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Scale Slider */}
                            <div className="bg-[var(--t-surface2)] p-6 rounded-3xl border border-[var(--t-border)] space-y-6">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Scaling Multiplier</label>
                                    <span className="text-[12px] font-black text-[var(--t-primary)] font-mono bg-[var(--t-surface)] px-3 py-1 rounded-lg border border-[var(--t-border)]">{typography[activeStyleTab].scale.toFixed(2)}x</span>
                                </div>
                                <input 
                                    type="range" min="0.5" max="4.0" step="0.05"
                                    value={typography[activeStyleTab].scale}
                                    onChange={(e) => updateTypography(activeStyleTab, { scale: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-[var(--t-surface)] rounded-full appearance-none cursor-pointer accent-[var(--t-primary)]"
                                />
                                {/* Global Base Size Integration (Only in Body tab) */}
                                {activeStyleTab === 'body' && (
                                    <div className="pt-6 border-t border-[var(--t-border)] space-y-6">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Global Base Pixel Grid</label>
                                            <span className="text-[12px] font-black text-[var(--t-primary)] font-mono bg-[var(--t-surface)] px-3 py-1 rounded-lg border border-[var(--t-border)]">{typography.baseSize}px</span>
                                        </div>
                                        <input 
                                            type="range" min="12" max="24" step="1"
                                            value={typography.baseSize}
                                            onChange={(e) => updateTypography('global', { baseSize: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-[var(--t-surface)] rounded-full appearance-none cursor-pointer accent-purple-500"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                {/* Spacing */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Tracking</label>
                                    <div className="flex flex-col gap-2">
                                        {[
                                            { val: '-0.05em', label: 'Tight' },
                                            { val: '0em', label: 'Normal' },
                                            { val: '0.1em', label: 'Wide' },
                                            { val: '0.25em', label: 'Widest' }
                                        ].map(space => (
                                            <button
                                                key={space.val}
                                                onClick={() => updateTypography(activeStyleTab, { spacing: space.val })}
                                                className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex justify-between items-center ${typography[activeStyleTab].spacing === space.val ? 'bg-[var(--t-primary)]/10 text-[var(--t-primary)] border border-[var(--t-primary)]/50' : 'bg-[var(--t-surface2)] text-[var(--t-text)] border border-transparent hover:bg-[var(--t-surface)] hover:border-[var(--t-border)]'}`}
                                            >
                                                <span>{space.label}</span>
                                                <span className="font-mono text-[10px] opacity-50">{space.val}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Weight */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Weight Matrix</label>
                                    <div className="flex flex-col gap-2">
                                        {['300', '400', '500', '700', '900'].map(w => (
                                            <button 
                                                key={w}
                                                onClick={() => updateTypography(activeStyleTab, { weight: w })}
                                                className={`py-3 px-4 rounded-xl text-[11px] transition-all flex justify-between items-center ${typography[activeStyleTab].weight === w ? 'bg-[var(--t-primary)]/10 text-[var(--t-primary)] font-black border border-[var(--t-primary)]/50' : 'bg-[var(--t-surface2)] text-[var(--t-text)] font-medium border border-transparent hover:bg-[var(--t-surface)] hover:border-[var(--t-border)]'}`}
                                            >
                                                <span>{w === '300' ? 'Light' : w === '400' ? 'Regular' : w === '500' ? 'Medium' : w === '700' ? 'Bold' : 'Black'}</span>
                                                <span className="font-mono text-[10px] opacity-50">w{w}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Transform */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Case Matrix</label>
                                    <div className="flex flex-col gap-2">
                                        {['none', 'uppercase', 'lowercase'].map(tx => (
                                            <button
                                                key={tx}
                                                onClick={() => updateTypography(activeStyleTab, { transform: tx })}
                                                className={`py-3 px-4 rounded-xl text-[11px] font-bold transition-all flex justify-between items-center ${typography[activeStyleTab].transform === tx ? 'bg-[var(--t-primary)]/10 text-[var(--t-primary)] border border-[var(--t-primary)]/50' : 'bg-[var(--t-surface2)] text-[var(--t-text)] border border-transparent hover:bg-[var(--t-surface)] hover:border-[var(--t-border)]'}`}
                                            >
                                                <span style={{ textTransform: tx }}>{tx === 'none' ? 'Default' : tx}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Edit Profile Modal ── */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0d1117]/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsEditModalOpen(false)} />
                    
                    <form
                        onSubmit={handleSave}
                        className="relative bg-[var(--t-surface)] rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-[var(--t-border)] flex flex-col max-h-[90vh]"
                    >
                        <div className="px-8 py-6 border-b border-[var(--t-border)] bg-gradient-to-r from-blue-600/5 to-transparent flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-2xl font-black text-[var(--t-text)] tracking-tight">Edit Profile</h3>
                                <p className="text-[var(--t-text3)] text-sm font-medium">Update your personal information and contact details.</p>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsEditModalOpen(false)}
                                className="w-10 h-10 rounded-xl bg-[var(--t-surface2)] border border-[var(--t-border)] flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all text-[var(--t-text3)]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto scrollbar-thin space-y-8 flex-1">
                            {/* Avatar Upload */}
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-2xl bg-[var(--t-surface2)] border border-[var(--t-border)] overflow-hidden shrink-0">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[var(--t-text3)]">
                                            <User className="w-8 h-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text3)] block">Profile Photo</label>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleAvatarChange}
                                        className="block w-full text-sm text-[var(--t-text3)]
                                            file:mr-4 file:py-2.5 file:px-5
                                            file:rounded-xl file:border-0
                                            file:text-[10px] file:font-black file:uppercase file:tracking-widest
                                            file:bg-[var(--t-primary)]/10 file:text-[var(--t-primary)]
                                            hover:file:bg-[var(--t-primary)]/20 file:transition-colors file:cursor-pointer cursor-pointer"
                                    />
                                    <p className="text-xs text-[var(--t-text3)]">Square image recommended. Max 5MB.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">First Name</label>
                                    <input 
                                        type="text" 
                                        name="first_name" 
                                        value={formData.first_name} 
                                        onChange={handleInputChange} 
                                        className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--t-text)] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-[var(--t-text3)]/50" 
                                        placeholder="Enter first name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Last Name</label>
                                    <input 
                                        type="text" 
                                        name="last_name" 
                                        value={formData.last_name} 
                                        onChange={handleInputChange} 
                                        className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--t-text)] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-[var(--t-text3)]/50" 
                                        placeholder="Enter last name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Professional Bio</label>
                                <textarea 
                                    name="bio" 
                                    value={formData.bio} 
                                    onChange={handleInputChange} 
                                    rows="3"
                                    className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--t-text)] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-[var(--t-text3)]/50 resize-none" 
                                    placeholder="Brief description of your role and responsibilities"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        name="phone_number" 
                                        value={formData.phone_number} 
                                        onChange={handleInputChange} 
                                        className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--t-text)] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-[var(--t-text3)]/50" 
                                        placeholder="+977..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Address</label>
                                    <input 
                                        type="text" 
                                        name="address" 
                                        value={formData.address} 
                                        onChange={handleInputChange} 
                                        className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--t-text)] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-[var(--t-text3)]/50" 
                                        placeholder="City, Country"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-[var(--t-border)] bg-[var(--t-surface2)]/30 shrink-0 flex gap-4">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)] hover:text-[var(--t-text)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Syncing Data...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Profile
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );

    if (isMobile) {
        return (
            <MobileLayout title="Profile" subtitle="Identity Manager">
                {content}
            </MobileLayout>
        );
    }

    return <div className="p-12 max-w-7xl mx-auto">{content}</div>;
};

export default Profile;
