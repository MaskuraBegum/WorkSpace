import { useState, useEffect, useRef } from 'react';
import {
  X, Camera, Check, Eye, EyeOff,
  Trash2, Shield, MessageSquare, Users, AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { uploadToCloudinary } from '../../services/upload';
import { disconnectSocket } from '../../services/socket';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ProfilePanel({ onClose }) {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [tab, setTab] = useState('profile');
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false });
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/profile');
      setProfile(data);
      setName(data.name);
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    setUploadingAvatar(true);
    try {
      const { url } = await uploadToCloudinary(file);
      await api.put('/profile/avatar', { avatarUrl: url });
      setProfile(prev => ({ ...prev, avatarUrl: url }));
      setUser({ ...user, avatarUrl: url });
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      fileInputRef.current.value = '';
    }
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!name.trim() || name === profile.name) return;
    setSavingName(true);
    try {
      const { data } = await api.put('/profile/name', { name });
      setProfile(prev => ({ ...prev, name: data.name }));
      setUser({ ...user, name: data.name });
      toast.success('Name updated!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return toast.error('Passwords do not match');
    if (passwords.new.length < 6) return toast.error('Password must be at least 6 characters');
    setSavingPassword(true);
    try {
      await api.put('/profile/password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      setPasswords({ current: '', new: '', confirm: '' });
      toast.success('Password changed!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return toast.error('Enter your password to confirm');
    setDeleting(true);
    try {
      await api.delete('/profile', { data: { password: deletePassword } });
      disconnectSocket();
      logout();
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const tabs = [
    { key: 'profile', label: 'Edit Profile' },
    { key: 'security', label: 'Security' },
    { key: 'danger', label: 'Danger Zone' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <h2 className="text-white font-bold text-base">My Profile</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-transparent hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Avatar + info + stats */}
            <div className="px-6 py-5 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
  {/* Avatar with view + edit */}
  <div className="relative" style={{ width: '80px', height: '80px' }}>
    {/* Main avatar */}
    <div
      className="w-full h-full rounded-full overflow-hidden border-2 border-amber-400 shadow-lg shadow-amber-400/20 cursor-pointer"
      onClick={() => profile?.avatarUrl && setShowImageViewer(true)}
    >
      {profile?.avatarUrl ? (
        <img
          src={profile.avatarUrl.replace('/upload/', '/upload/q_100,f_auto/')}
          alt="avatar"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl font-black text-zinc-900">
          {profile?.name?.charAt(0).toUpperCase()}
        </div>
      )}
    </div>

    {/* Always visible edit button */}
    <button
      onClick={() => fileInputRef.current?.click()}
      disabled={uploadingAvatar}
      className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-400 hover:bg-amber-500 rounded-full flex items-center justify-center shadow-lg transition border-2 border-zinc-900"
      title="Change photo"
    >
      {uploadingAvatar
        ? <div className="w-3 h-3 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        : <Camera size={13} className="text-zinc-900" />
      }
    </button>
  </div>

  {/* Change photo text button */}
  <button
    onClick={() => fileInputRef.current?.click()}
    disabled={uploadingAvatar}
    className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition"
  >
    {uploadingAvatar ? 'Uploading...' : 'Change photo'}
  </button>
</div>
<input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
               
                {/* Name + email + badges */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-lg truncate leading-tight">{profile?.name}</p>
                  <p className="text-zinc-500 text-xs truncate mt-0.5 mb-2">{profile?.email}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                      <Shield size={9} /> Active
                    </span>
                    <span className="text-xs font-medium text-amber-600 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                      Email unverified
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-zinc-800 rounded-xl p-3 border border-zinc-700 flex items-center gap-3">
                  <MessageSquare size={15} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-white font-black text-lg leading-none">{profile?.stats?.messages || 0}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">Messages sent</p>
                  </div>
                </div>
                <div className="bg-zinc-800 rounded-xl p-3 border border-zinc-700 flex items-center gap-3">
                  <Users size={15} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-white font-black text-lg leading-none">{profile?.stats?.conversations || 0}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">Conversations</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 px-6 flex-shrink-0">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`py-3 px-3 text-xs font-semibold border-b-2 transition mr-2 ${
                    tab === t.key
                      ? 'text-amber-400 border-amber-400'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                  style={{ marginBottom: '-1px' }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* Edit Profile */}
              {tab === 'profile' && (
                <form onSubmit={handleUpdateName} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-2">Display Name</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-zinc-800 text-white border border-zinc-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-2">Email Address</label>
                    <input
                      value={profile?.email}
                      disabled
                      className="w-full bg-zinc-800/50 text-zinc-500 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none cursor-not-allowed"
                    />
                    <p className="text-xs text-zinc-600 mt-1.5">Email cannot be changed. Verification coming soon.</p>
                  </div>
                  <button
                    type="submit"
                    disabled={savingName || name === profile?.name || !name.trim()}
                    className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-zinc-900 font-bold py-2.5 rounded-xl text-sm transition"
                  >
                    {savingName ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              )}

              {/* Security */}
              {tab === 'security' && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <p className="text-xs text-zinc-500">Choose a strong password with at least 6 characters.</p>

                  {[
                    { key: 'current', label: 'Current Password' },
                    { key: 'new', label: 'New Password' },
                    { key: 'confirm', label: 'Confirm New Password' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs font-semibold text-zinc-400 block mb-2">{label}</label>
                      <div className="relative">
                        <input
                          type={showPass[key] ? 'text' : 'password'}
                          value={passwords[key]}
                          onChange={e => setPasswords(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder="••••••••"
                          className="w-full bg-zinc-800 text-white border border-zinc-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none transition"
                        />
                        {key !== 'confirm' && (
                          <button
                            type="button"
                            onClick={() => setShowPass(p => ({ ...p, [key]: !p[key] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                          >
                            {showPass[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {passwords.new && passwords.confirm && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${
                      passwords.new === passwords.confirm ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {passwords.new === passwords.confirm
                        ? <><Check size={12} /> Passwords match</>
                        : <><X size={12} /> Passwords don't match</>
                      }
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={savingPassword || !passwords.current || !passwords.new || !passwords.confirm}
                    className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-zinc-900 font-bold py-2.5 rounded-xl text-sm transition"
                  >
                    {savingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              )}

              {/* Danger Zone */}
              {tab === 'danger' && (
                <div className="space-y-5">
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex gap-3">
                    <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-semibold text-sm mb-1">Delete Account</p>
                      <p className="text-zinc-500 text-xs leading-relaxed">
                        This permanently deletes your account, all messages, and removes you from all conversations. This cannot be undone.
                      </p>
                    </div>
                  </div>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold py-2.5 rounded-xl text-sm transition"
                    >
                      Delete My Account
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-zinc-400 block">
                        Enter your password to confirm:
                      </label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)}
                        placeholder="Your password"
                        className="w-full bg-zinc-800 text-white border border-zinc-700 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleting || !deletePassword}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 text-red-400 border border-red-500/30 font-semibold py-2.5 rounded-xl text-sm transition"
                        >
                          <Trash2 size={13} />
                          {deleting ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                          onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-semibold py-2.5 rounded-xl text-sm transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {/* Image viewer lightbox */}
{showImageViewer && profile?.avatarUrl && (
  <div
    className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center backdrop-blur-sm"
    onClick={() => setShowImageViewer(false)}
  >
    <div className="relative max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
      <img
        src={profile.avatarUrl.replace('/upload/', '/upload/q_100,f_auto/')}
        alt="Profile photo"
        className="w-full rounded-2xl shadow-2xl"
      />
      <button
        onClick={() => setShowImageViewer(false)}
        className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition"
      >
        <X size={16} />
      </button>
      <button
        onClick={() => { setShowImageViewer(false); fileInputRef.current?.click(); }}
        className="absolute bottom-3 right-3 flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-bold text-xs px-3 py-2 rounded-lg transition"
      >
        <Camera size={13} /> Change photo
      </button>
    </div>
  </div>
)}
    </div>
  );
}
