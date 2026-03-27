import { useState } from 'react';
import { User, Lock } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { authAPI } from '../services/api';

export default function Settings() {
  const { user, fetchUser } = useAuthStore();
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ current: '', newPwd: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function handleProfile(e) {
    e.preventDefault();
    setErr('');
    try {
      await authAPI.updateProfile?.(profile) || {};
      await fetchUser();
      setMsg('Profile updated!');
    } catch (err) {
      setErr(err.response?.data?.error || 'Failed to update profile');
    }
  }

  async function handlePassword(e) {
    e.preventDefault();
    setErr('');
    if (passwords.newPwd !== passwords.confirm) { setErr('Passwords do not match'); return; }
    if (passwords.newPwd.length < 6) { setErr('Min 6 characters'); return; }
    try {
      await authAPI.changePassword?.(passwords) || {};
      setPasswords({ current: '', newPwd: '', confirm: '' });
      setMsg('Password changed!');
    } catch (err) {
      setErr(err.response?.data?.error || 'Failed to change password');
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account</p>
      </div>

      {msg && <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm text-green-400">{msg}</div>}
      {err && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{err}</div>}

      {/* Profile */}
      <form onSubmit={handleProfile} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={14} className="text-gray-400" />
          <p className="font-medium text-sm">Profile</p>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Full name</label>
          <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Email</label>
          <input value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500" />
        </div>
        <button className="bg-green-500 hover:bg-green-400 text-gray-900 font-semibold text-sm px-5 py-2 rounded-lg transition-colors">Save Changes</button>
      </form>

      {/* Password */}
      <form onSubmit={handlePassword} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={14} className="text-gray-400" />
          <p className="font-medium text-sm">Change Password</p>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Current password</label>
          <input type="password" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" placeholder="••••••••" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">New password</label>
          <input type="password" value={passwords.newPwd} onChange={e => setPasswords({ ...passwords, newPwd: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" placeholder="Min 6 characters" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Confirm new password</label>
          <input type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" placeholder="••••••••" />
        </div>
        <button className="bg-green-500 hover:bg-green-400 text-gray-900 font-semibold text-sm px-5 py-2 rounded-lg transition-colors">Update Password</button>
      </form>
    </div>
  );
}
