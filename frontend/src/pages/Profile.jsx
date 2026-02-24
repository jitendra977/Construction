import React, { useState } from 'react';
import { useConstruction } from '../context/ConstructionContext';
import { User, Mail, Shield, Phone, MapPin, Info, Bell, Settings, Camera, Save, X } from 'lucide-react';
import { getMediaUrl } from '../services/api';
import Modal from '../components/common/Modal';

const Profile = () => {
    const { user, updateProfile } = useConstruction();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        profile: {
            bio: user?.profile?.bio || '',
            phone_number: user?.profile?.phone_number || '',
            address: user?.profile?.address || '',
            preferred_language: user?.profile?.preferred_language || 'en',
            notifications_enabled: user?.profile?.notifications_enabled ?? true,
            avatar: null
        }
    });
    const [previewUrl, setPreviewUrl] = useState(null);

    if (!user) return null;

    const avatarUrl = getMediaUrl(user.profile?.avatar);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('profile.')) {
            const profileField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                profile: {
                    ...prev.profile,
                    [profileField]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                profile: { ...prev.profile, avatar: file }
            }));
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
            } else {
                alert(typeof result.error === 'string' ? result.error : 'Failed to update profile');
            }
        } catch (error) {
            console.error("Update error", error);
            alert("An error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header / Banner */}
            <div className="relative mb-8">
                <div className="h-48 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <User size={200} />
                    </div>
                </div>

                <div className="absolute -bottom-6 left-8 flex items-end gap-6">
                    <div className="w-32 h-32 rounded-3xl bg-white p-1 shadow-xl overflow-hidden relative group">
                        {user.profile?.avatar ? (
                            <img
                                src={avatarUrl}
                                alt={user.username}
                                className="w-full h-full object-cover rounded-[20px]"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = `<div class="w-full h-full rounded-[20px] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-4xl font-bold text-indigo-600">${user.username?.charAt(0).toUpperCase()}</div>`;
                                }}
                            />
                        ) : (
                            <div className="w-full h-full rounded-[20px] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-4xl font-bold text-indigo-600">
                                {user.username?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Camera className="text-white" size={24} />
                        </button>
                    </div>
                    <div className="mb-6">
                        <h1 className="text-3xl font-black text-white drop-shadow-md">{user.username}</h1>
                        <div className="flex gap-2 mt-1">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                <Shield size={12} />
                                {user.role || 'Admin'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Main Info */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Info className="text-indigo-600" size={20} />
                            Personal Information
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                                <p className="text-gray-900 font-medium">{user.first_name || 'N/A'} {user.last_name || ''}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                                <p className="text-gray-900 font-medium flex items-center gap-2 text-sm">
                                    <Mail size={14} className="text-gray-400" />
                                    {user.email}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
                                <p className="text-gray-900 font-medium flex items-center gap-2">
                                    <Phone size={14} className="text-gray-400" />
                                    {user.profile?.phone_number || 'Not provided'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Location</label>
                                <p className="text-gray-900 font-medium flex items-center gap-2">
                                    <MapPin size={14} className="text-gray-400" />
                                    {user.profile?.address || 'Not provided'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-50">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">About / Bio</label>
                            <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                                {user.profile?.bio || 'You haven\'t added a bio yet. Tell us more about yourself and your role in the project.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Settings className="text-indigo-600" size={20} />
                            Preferences
                        </h2>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <Bell size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Notifications</span>
                                </div>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${user.profile?.notifications_enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${user.profile?.notifications_enabled ? 'left-6' : 'left-1'}`} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                                        <Info size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Language</span>
                                </div>
                                <span className="text-xs font-bold text-indigo-600 uppercase">
                                    {user.profile?.preferred_language === 'en' ? 'English' : (user.profile?.preferred_language || 'en')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl shadow-gray-200 hover:bg-black transition-all transform hover:-translate-y-1"
                    >
                        Edit Profile
                    </button>
                </div>
            </div>

            {/* Edit Profile Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Profile"
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleSave} className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <div className="relative w-24 h-24">
                            <div className="w-full h-full rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-indigo-100">
                                {previewUrl || user.profile?.avatar ? (
                                    <img
                                        src={previewUrl || getMediaUrl(user.profile.avatar)}
                                        className="w-full h-full object-cover"
                                        alt="Preview"
                                    />
                                ) : (
                                    <User size={32} className="text-gray-300" />
                                )}
                            </div>
                            <label className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 text-white rounded-xl cursor-pointer shadow-lg hover:bg-indigo-700 transition-colors">
                                <Camera size={16} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                            </label>
                        </div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Change Profile Picture</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium"
                                placeholder="Enter first name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium"
                                placeholder="Enter last name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                            <input
                                type="text"
                                name="profile.phone_number"
                                value={formData.profile.phone_number}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium"
                                placeholder="+977-98XXXXXXXX"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Preferred Language</label>
                            <select
                                name="profile.preferred_language"
                                value={formData.profile.preferred_language}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium appearance-none"
                            >
                                <option value="en">English</option>
                                <option value="np">Nepali</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Address</label>
                            <input
                                type="text"
                                name="profile.address"
                                value={formData.profile.address}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium"
                                placeholder="City, Country"
                            />
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Bio</label>
                            <textarea
                                name="profile.bio"
                                value={formData.profile.bio}
                                onChange={handleInputChange}
                                rows="3"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium resize-none"
                                placeholder="Tell us about yourself..."
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl">
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-indigo-900">Email Notifications</h4>
                            <p className="text-xs text-indigo-600">Receive updates about your project via email.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                                ...prev,
                                profile: { ...prev.profile, notifications_enabled: !prev.profile.notifications_enabled }
                            }))}
                            className={`w-12 h-6 rounded-full relative transition-colors ${formData.profile.notifications_enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.profile.notifications_enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsEditModalOpen(false)}
                            className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-3 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <><Save size={18} /> Save Changes</>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Profile;
