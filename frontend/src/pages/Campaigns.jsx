import { useEffect, useState } from 'react';
import { Play, Pause, Plus, X } from 'lucide-react';
import useAppStore from '../stores/appStore';

function ProgressBar({ sent, total }) {
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
  return (
    <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${map[status] || map.draft}`}>
      {status}
    </span>
  );
}

export default function Campaigns() {
  const { campaigns, loadingCampaigns, fetchCampaigns, createCampaign, startCampaign, pauseCampaign, usage } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', message: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const campaignsEnabled = usage?.features?.campaigns;

  useEffect(() => { fetchCampaigns(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await createCampaign(form);
      setForm({ name: '', message: '' });
      setShowForm(false);
      fetchCampaigns();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Campaigns</h1>
          <p className="text-gray-500 text-sm mt-0.5">Create and manage bulk messaging campaigns</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {/* Plan gate */}
      {!campaignsEnabled && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-sm text-yellow-400 font-medium">Campaigns require Starter plan or higher</p>
          <p className="text-xs text-gray-500 mt-1">Upgrade to access bulk messaging, contacts upload, and automation</p>
          <a href="/billing" className="inline-block mt-2 text-xs text-green-400 hover:underline">View plans →</a>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">New Campaign</p>
            <button type="button" onClick={() => setShowForm(false)}><X size={16} className="text-gray-500" /></button>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Campaign Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" placeholder="e.g. Summer Sale" required />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Message Template</label>
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none" placeholder="Hi {{name}}, your order is ready!" required />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={creating} className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-900 font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {creating ? 'Creating...' : 'Create Campaign'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* Campaign list */}
      <div className="space-y-3">
        {campaigns.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
            <p className="text-gray-500 text-sm">No campaigns yet. Create your first one!</p>
          </div>
        )}
        {campaigns.map(c => (
          <div key={c._id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-xs text-gray-500 truncate">{c.message}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {c.status === 'draft' && (
                  <button onClick={() => startCampaign(c._id)} className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"><Play size={14} /></button>
                )}
                {c.status === 'running' && (
                  <button onClick={() => pauseCampaign(c._id)} className="p-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-colors"><Pause size={14} /></button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-500">{c.sent || 0} / {c.total || 0} sent</span>
              <span className="text-xs text-gray-600">{c.total > 0 ? Math.round(((c.sent || 0) / c.total) * 100) : 0}%</span>
            </div>
            <ProgressBar sent={c.sent || 0} total={c.total || 0} />
          </div>
        ))}
      </div>
    </div>
  );
}
