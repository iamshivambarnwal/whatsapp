import { useEffect, useState } from 'react';
import { Zap, Plus, Trash2, MessageSquare } from 'lucide-react';
import { automationAPI } from '../services/api';

export default function Automation() {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', trigger: '', matchMode: 'contains', replyMessage: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planError, setPlanError] = useState('');

  async function loadRules() {
    try {
      const { data } = await automationAPI.listRules();
      setRules(data.rules || []);
    } catch {}
  }

  useEffect(() => { loadRules(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPlanError('');
    try {
      await automationAPI.createRule(form);
      setForm({ name: '', trigger: '', matchMode: 'contains', replyMessage: '' });
      setShowForm(false);
      loadRules();
    } catch (err) {
      if (err.response?.status === 403) setPlanError(err.response.data.error);
      else setError(err.response?.data?.error || 'Failed to create rule');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    await automationAPI.deleteRule(id);
    loadRules();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Automation</h1>
          <p className="text-gray-500 text-sm mt-0.5">Auto-reply rules for incoming messages</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
          <Plus size={14} /> New Rule
        </button>
      </div>

      {planError && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-sm text-yellow-400 font-medium">Automation requires Pro plan or higher</p>
          <a href="/billing" className="inline-block mt-2 text-xs text-green-400 hover:underline">View plans →</a>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <p className="font-medium text-sm">New Auto-Reply Rule</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Rule Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" placeholder="e.g. Out of office" required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Match Mode</label>
              <select value={form.matchMode} onChange={e => setForm({ ...form, matchMode: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500">
                <option value="contains">Contains</option>
                <option value="exact">Exact Match</option>
                <option value="starts_with">Starts With</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Keyword / Trigger</label>
            <input value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" placeholder="e.g. hi, order status" required />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Auto-Reply Message</label>
            <textarea value={form.replyMessage} onChange={e => setForm({ ...form, replyMessage: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none" placeholder="Thanks for messaging! We'll get back shortly." required />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-900 font-semibold text-sm px-5 py-2 rounded-lg transition-colors">{loading ? 'Creating...' : 'Create Rule'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {rules.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
            <Zap size={24} className="mx-auto text-gray-700 mb-2" />
            <p className="text-gray-500 text-sm">No automation rules yet. Create one to auto-reply to messages.</p>
          </div>
        )}
        {rules.map(r => (
          <div key={r._id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} className="text-green-400" />
                  <p className="font-medium text-sm">{r.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">{r.matchMode}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-500 w-14 flex-shrink-0 pt-0.5">Trigger</span>
                    <code className="text-xs text-yellow-400 bg-yellow-500/5 px-2 py-0.5 rounded">{r.trigger}</code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-500 w-14 flex-shrink-0 pt-0.5">Reply</span>
                    <span className="text-xs text-gray-300">{r.replyMessage}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(r._id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
