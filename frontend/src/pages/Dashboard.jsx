import { useEffect } from 'react';
import { MessageSquare, AlertCircle, Clock, Zap, ArrowRight } from 'lucide-react';
import useAppStore from '../stores/appStore';
import useAuthStore from '../stores/authStore';
import { Link } from 'react-router-dom';

function StatCard({ icon: Icon, label, value, color = 'green' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <Icon size={18} className={`text-${color}-400`} />
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value ?? '—'}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { stats, fetchStats, fetchUsage, usage, waStatus, fetchWhatsAppStatus } = useAppStore();

  useEffect(() => {
    fetchStats();
    fetchUsage();
    fetchWhatsAppStatus();
  }, []);

  const pending = stats?.queue?.waiting || 0;
  const failed = stats?.db?.failed || 0;
  const sent = stats?.db?.sent || 0;
  const total = stats?.db?.total || 0;
  const limit = usage?.usage?.dailyLimit || usage?.usage?.monthlyLimit || 50;
  const used = usage?.usage?.daily || usage?.usage?.monthly || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Here's what's happening today</p>
        </div>
        <Link
          to="/whatsapp"
          className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
        >
          Connect WhatsApp <ArrowRight size={14} />
        </Link>
      </div>

      {/* Onboarding nudge */}
      {!waStatus?.connected && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Connect your WhatsApp to start</p>
            <p className="text-xs text-gray-400 mt-0.5">Scan the QR code and start sending messages</p>
          </div>
          <Link to="/whatsapp">
            <button className="bg-green-500 hover:bg-green-400 text-gray-900 font-semibold text-xs px-4 py-2 rounded-lg transition-colors">
              Connect Now
            </button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Total Sent" value={total} />
        <StatCard icon={Zap} label="Delivered" value={sent} color="blue" />
        <StatCard icon={AlertCircle} label="Failed" value={failed} color="red" />
        <StatCard icon={Clock} label="Queue Pending" value={pending} color="yellow" />
      </div>

      {/* Usage bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Usage ({user?.plan || 'free'} plan)</span>
          <span className="text-sm text-gray-200">{used} / {limit}</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">{limit - used} messages remaining</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Send Message', to: '/messages', desc: 'Single message' },
          { label: 'New Campaign', to: '/campaigns', desc: 'Bulk messaging' },
          { label: 'Upload Contacts', to: '/contacts', desc: 'Build your list' },
        ].map(({ label, to, desc }) => (
          <Link key={to} to={to} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors group">
            <p className="font-medium text-sm group-hover:text-green-400 transition-colors">{label}</p>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
