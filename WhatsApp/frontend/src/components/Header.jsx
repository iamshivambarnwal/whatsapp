import { LogOut, Bell } from 'lucide-react';
import useAuthStore from '../stores/authStore';

export default function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-5">
      <div className="text-sm text-gray-400">
        Welcome back, <span className="text-white font-medium">{user?.name || 'User'}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
            {user?.plan || 'free'} plan
          </span>
        </div>
        <Bell size={16} className="text-gray-500 cursor-pointer hover:text-gray-300" />
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  );
}
