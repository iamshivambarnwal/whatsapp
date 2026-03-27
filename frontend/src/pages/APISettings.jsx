import { useState } from 'react';
import { Key, Copy, Check, AlertTriangle } from 'lucide-react';
import useAuthStore from '../stores/authStore';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
      {copied ? <><Check size={12} className="text-green-400" /> Copied!</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}

export default function APISettings() {
  const { user } = useAuthStore();
  const apiKey = user?.apiKey || 'sk_live_demo_key_not_set';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">API Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your API keys and view usage</p>
      </div>

      {/* API Key */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Key size={16} className="text-gray-400" />
          <p className="font-medium text-sm">API Key</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5">
          <code className="flex-1 text-sm text-gray-300 font-mono truncate">{apiKey}</code>
          <CopyButton text={apiKey} />
        </div>
        <p className="text-xs text-gray-600 mt-2">Keep this key secret. Do not share it in public repositories.</p>
      </div>

      {/* Rate limit info */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-yellow-400 font-medium">Rate Limits</p>
          <p className="text-xs text-gray-400 mt-1">
            API calls are subject to your plan's message rate limits. Free: 10/min, Starter: 50/min, Pro: 200/min, Enterprise: 1000/min.
          </p>
        </div>
      </div>

      {/* API Docs */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <p className="font-medium text-sm">API Documentation</p>

        {[
          { method: 'POST', path: '/api/public/send', desc: 'Send a WhatsApp message', body: '{ "number": "91...", "message": "Hello", "apiKey": "sk_..." }' },
          { method: 'POST', path: '/api/public/contact', desc: 'Add a contact', body: '{ "phone": "91...", "name": "John", "apiKey": "sk_..." }' },
          { method: 'POST', path: '/api/public/campaign/start', desc: 'Start a campaign', body: '{ "campaignId": "...", "apiKey": "sk_..." }' },
        ].map(({ method, path, desc, body }) => (
          <div key={path} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${method === 'POST' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>{method}</span>
              <code className="text-xs text-gray-300 font-mono">{path}</code>
              <CopyButton text={`curl -X ${method} http://localhost:3000${path} -H "Content-Type: application/json" -d '${body}'`} />
            </div>
            <p className="text-xs text-gray-500 mb-2">{desc}</p>
            <pre className="text-xs text-gray-400 bg-gray-900 border border-gray-700 rounded p-2 overflow-x-auto">{body}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
