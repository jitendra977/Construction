import React, { useState } from 'react';
import { useConstruction } from '../context/ConstructionContext';
import { User, Mail, Shield, Phone, MapPin, Info, Bell, Settings, Camera, Save, Activity, Type, RotateCcw } from 'lucide-react';
import { getMediaUrl } from '../services/api';
import Modal from '../components/common/Modal';
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

    const avatarUrl = getMediaUrl(user.profile_image);
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
        <div className="space-y-8 pb-12">
            {/* Header / Banner */}
            <div className="relative mb-12">
                <div className="h-40 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl overflow-hidden shadow-lg">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <User size={160} />
                    </div>
                </div>

                <div className="absolute -bottom-6 left-6 flex items-end gap-5">
                    <div className="w-28 h-28 rounded-3xl bg-white p-1 shadow-xl overflow-hidden relative group border border-slate-100">
                        {user.profile_image ? (
                            <img
                                src={avatarUrl}
                                alt={user.username}
                                className="w-full h-full object-cover rounded-2xl"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = `<div class="w-full h-full rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl font-bold text-emerald-600">${user.username?.charAt(0).toUpperCase()}</div>`;
                                }}
                            />
                        ) : (
                            <div className="w-full h-full rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl font-bold text-emerald-600">
                                {user.username?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <button onClick={() => setIsEditModalOpen(true)} className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white" size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="pt-4 px-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{user.username}</h1>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit mt-2">
                    <Shield size={10} /> {roleName}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="card-glass rounded-[2rem] p-8 shadow-sm border border-slate-50">
                        <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                            <Info className="text-emerald-600" size={18} /> Basic Intel
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {[
                                { label: 'Name', value: `${user.first_name || ''} ${user.last_name || ''}`, icon: <User size={14} /> },
                                { label: 'Email', value: user.email, icon: <Mail size={14} /> },
                                { label: 'Phone', value: user.phone_number || 'N/A', icon: <Phone size={14} /> },
                                { label: 'Location', value: user.address || 'N/A', icon: <MapPin size={14} /> }
                            ].map((item, i) => (
                                <div key={i} className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</label>
                                    <p className="text-slate-800 font-bold text-[11px] flex items-center gap-2 truncate">
                                        <span className="text-emerald-400">{item.icon}</span> {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card-glass rounded-[2rem] p-8 shadow-sm border border-slate-50">
                        <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                            <Settings className="text-emerald-600" size={18} /> System Config
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <span className="text-xs font-bold text-slate-600">Alerts</span>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${user.notifications_enabled ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${user.notifications_enabled ? 'left-6' : 'left-1'}`} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <span className="text-[11px] font-bold text-slate-600">Language</span>
                                <span className="text-[10px] font-black text-emerald-600 uppercase">
                                    {user.preferred_language === 'en' ? 'English' : 'Nepali'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="card-glass rounded-[2rem] p-8 shadow-sm border border-slate-50">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Settings className="text-emerald-600" size={18} /> Style Lab
                            </h2>
                            <button 
                                onClick={resetTypography}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-400 text-[9px] font-black rounded-lg border border-slate-100 uppercase tracking-widest active:scale-95 transition-all"
                            >
                                <RotateCcw size={10} /> Reset
                            </button>
                        </div>
                        
                        {/* Tab Navigation */}
                        <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl mb-8">
                            {['title', 'subtitle', 'header', 'body'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveStyleTab(tab)}
                                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeStyleTab === tab ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Font Family Selection */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Type size={12} /> {activeStyleTab} Typeface
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Space Grotesk', 'JetBrains Mono', 'Inter', 'Outfit', 'Roboto'].map(font => (
                                        <button 
                                            key={font}
                                            onClick={() => updateTypography(activeStyleTab, { family: font })}
                                            className={`py-3 px-2 rounded-xl text-[10px] font-bold border transition-all ${typography[activeStyleTab].family === font ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-100 shadow-md' : 'bg-white text-slate-500 border-slate-100'}`}
                                            style={{ fontFamily: font }}
                                        >
                                            {font}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Scale Slider */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scaling Factor</label>
                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{typography[activeStyleTab].scale.toFixed(2)}x</span>
                                </div>
                                <input 
                                    type="range" min="0.5" max="4.0" step="0.05"
                                    value={typography[activeStyleTab].scale}
                                    onChange={(e) => updateTypography(activeStyleTab, { scale: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Spacing Control */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking</label>
                                        <span className="text-[10px] font-black text-emerald-600">{typography[activeStyleTab].spacing}</span>
                                    </div>
                                    <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
                                        {['-0.05em', '0em', '0.1em', '0.25em'].map(space => (
                                            <button
                                                key={space}
                                                onClick={() => updateTypography(activeStyleTab, { spacing: space })}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${typography[activeStyleTab].spacing === space ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                                            >
                                                {space === '0em' ? 'N' : space === '-0.05em' ? 'T' : 'W'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Transform Control */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case Matrix</label>
                                    <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
                                        {['none', 'uppercase', 'lowercase'].map(tx => (
                                            <button
                                                key={tx}
                                                onClick={() => updateTypography(activeStyleTab, { transform: tx })}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${typography[activeStyleTab].transform === tx ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                                            >
                                                {tx[0].toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Weight Matrix */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight Matrix</label>
                                <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
                                    {['300', '400', '500', '700', '900'].map(w => (
                                        <button 
                                            key={w}
                                            onClick={() => updateTypography(activeStyleTab, { weight: w })}
                                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${typography[activeStyleTab].weight === w ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}
                                        >
                                            {w === '300' ? 'LT' : w === '400' ? 'RG' : w === '500' ? 'MD' : w === '700' ? 'BD' : 'BK'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Global Base Size Integration */}
                            {activeStyleTab === 'body' && (
                                <div className="pt-6 border-t border-slate-100 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Base Pixel Grid</label>
                                        <span className="text-[10px] font-black text-emerald-600">{typography.baseSize}px</span>
                                    </div>
                                    <input 
                                        type="range" min="12" max="24" step="1"
                                        value={typography.baseSize}
                                        onChange={(e) => updateTypography('global', { baseSize: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-emerald-50 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <button onClick={() => setIsEditModalOpen(true)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-50">
                        Modify Profile
                    </button>
                    
                    <Link to="../activity-logs" className="w-full flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px]">
                        <Activity size={16} /> Audit Logs
                    </Link>
                </div>
            </div>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="PROFILE_COMMIT">
                <form onSubmit={handleSave} className="p-6 space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First</label>
                            <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last</label>
                            <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold" />
                        </div>
                    </div>
                    <button type="submit" disabled={saving} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">
                        {saving ? 'Syncing...' : 'Save Changes'}
                    </button>
                </form>
            </Modal>
        </div>
    );

    if (isMobile) {
        return (
            <MobileLayout title="Profile" subtitle="Identity Manager">
                {content}
            </MobileLayout>
        );
    }

    return <div className="p-12 max-w-5xl mx-auto">{content}</div>;
};

export default Profile;
