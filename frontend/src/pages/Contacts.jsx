import { useEffect, useState } from 'react';
import { Upload, UserPlus, Trash2, Search } from 'lucide-react';
import useAppStore from '../stores/appStore';

export default function Contacts() {
  const { contacts, loadingContacts, fetchContacts, uploadContacts, usage } = useAppStore();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [bulk, setBulk] = useState('');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const campaignsEnabled = usage?.features?.campaigns;

  useEffect(() => { fetchContacts({ search }); }, [search]);

  async function handleAddSingle(e) {
    e.preventDefault();
    await uploadContacts([{ name: form.name, phone: form.phone }]);
    setForm({ name: '', phone: '' });
    fetchContacts({ search });
  }

  async function handleBulkUpload(e) {
    e.preventDefault();
    setUploading(true);
    setResult(null);
    const lines = bulk.split('\n').filter(Boolean);
    const contacts = lines.map(line => {
      const [phone, name] = line.split(',').map(s => s.trim());
      return { phone: phone || '', name: name || 'Unknown' };
    });
    try {
      const data = await uploadContacts(contacts);
      setResult(data);
      setBulk('');
    } catch {}
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Contacts</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your contact list</p>
      </div>

      {!campaignsEnabled && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-sm text-yellow-400 font-medium">Contacts upload requires Starter plan or higher</p>
          <a href="/billing" className="inline-block mt-2 text-xs text-green-400 hover:underline">View plans →</a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Single add */}
        <form onSubmit={handleAddSingle} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <p className="font-medium text-sm flex items-center gap-2"><UserPlus size={14} className="text-gray-400" /> Add Contact</p>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" placeholder="Name" />
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" placeholder="91XXXXXXXXXX" required />
          <button type="submit" className="w-full bg-green-500 hover:bg-green-400 text-gray-900 font-semibold text-sm py-2 rounded-lg transition-colors">Add Contact</button>
        </form>

        {/* Bulk upload */}
        <form onSubmit={handleBulkUpload} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <p className="font-medium text-sm flex items-center gap-2"><Upload size={14} className="text-gray-400" /> Bulk Upload (CSV-like)</p>
          <textarea value={bulk} onChange={e => setBulk(e.target.value)} rows={5} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 resize-none font-mono" placeholder="919876543210,John&#10;919876543211,Jane" />
          <button type="submit" disabled={uploading || !bulk} className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-900 font-semibold text-sm py-2 rounded-lg transition-colors">
            {uploading ? 'Uploading...' : 'Upload Contacts'}
          </button>
        </form>
      </div>

      {result && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-400">
          Added: {result.added} | Skipped: {result.skipped}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" placeholder="Search contacts..." />
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Phone</th>
              <th className="text-right px-4 py-3 font-medium">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {contacts.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-600 text-xs">No contacts yet</td></tr>
            )}
            {contacts.map(c => (
              <tr key={c._id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 text-white">{c.name}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.phone}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
