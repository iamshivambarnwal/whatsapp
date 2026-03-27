import { useEffect, useState } from 'react';
import { Send, Filter } from 'lucide-react';
import useAppStore from '../stores/appStore';

function StatusBadge({ status }) {
  const map = {
    queued: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    sending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    sent: 'bg-green-500/10 text-green-400 border-green-500/20',
    delivered: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    read: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${map[status] || map.queued}`}>
      {status}
    </span>
  );
}

export default function Messages() {
  const { messages, loadingMessages, fetchMessages, sendMessage, waStatus } = useAppStore();
  const [form, setForm] = useState({ number: '', message: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { fetchMessages({ status: filterStatus || undefined }); }, [filterStatus]);

  async function handleSend(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    setSuccess('');
    try {
      await sendMessage(form);
      setSuccess('Message queued successfully!');
      setForm({ number: '', message: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
    }
    setSending(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Messages</h1>
        <p className="text-gray-500 text-sm mt-0.5">Send single messages and view delivery history</p>
      </div>

      {/* Send form */}
      <form onSubmit={handleSend} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Send size={14} className="text-gray-400" />
          <p className="font-medium text-sm">Send a Message</p>
        </div>
        {!waStatus?.connected && (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2 text-xs text-yellow-400">
            WhatsApp not connected. <a href="/whatsapp" className="underline">Connect first</a>.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Phone Number</label>
            <input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" placeholder="919876543210" required />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Message</label>
          <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none" placeholder="Type your message..." required />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-green-400">{success}</p>}
        <button type="submit" disabled={sending || !waStatus?.connected} className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors">
          {sending ? 'Queuing...' : 'Send Message'}
        </button>
      </form>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-gray-500" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500">
          <option value="">All statuses</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
              <th className="text-left px-4 py-3 font-medium">To</th>
              <th className="text-left px-4 py-3 font-medium">Message</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loadingMessages && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600 text-xs">Loading...</td></tr>
            )}
            {!loadingMessages && messages.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600 text-xs">No messages yet</td></tr>
            )}
            {messages.map(m => (
              <tr key={m._id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{m.to}</td>
                <td className="px-4 py-3 text-white text-xs max-w-xs truncate">{m.body}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3 text-gray-600 text-xs text-right">{new Date(m.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
