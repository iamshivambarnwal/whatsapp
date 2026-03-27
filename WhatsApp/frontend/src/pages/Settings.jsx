import { useState } from 'react';
import { Save, RefreshCw, Shield, Bell, Database, Wifi, User } from 'lucide-react';

function Settings() {
  const [settings, setSettings] = useState({
    apiEndpoint: 'http://localhost:3000',
    rateLimit: 30,
    retryAttempts: 3,
    sessionTimeout: 24,
    notifications: true,
    autoReply: false,
    webhookUrl: '',
    maxConnections: 5
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1">Configure your WhatsApp automation platform</p>
      </div>

      {/* WhatsApp Connection */}
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-500/20 rounded-lg">
            <Wifi className="text-green-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold">WhatsApp Connection</h2>
            <p className="text-sm text-gray-400">Manage your WhatsApp Web session</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
            <div>
              <p className="font-medium">Connection Status</p>
              <p className="text-sm text-gray-400">Active and ready</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm font-medium">Connected</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
            <div>
              <p className="font-medium">Session Expiry</p>
              <p className="text-sm text-gray-400">Session expires in 23 hours</p>
            </div>
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center gap-2 transition-colors">
              <RefreshCw size={16} />
              Reconnect
            </button>
          </div>
        </div>
      </div>

      {/* API Settings */}
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <Database className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold">API Configuration</h2>
            <p className="text-sm text-gray-400">Configure backend connection settings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">API Endpoint</label>
            <input
              type="text"
              value={settings.apiEndpoint}
              onChange={(e) => setSettings({...settings, apiEndpoint: e.target.value})}
              className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Webhook URL</label>
            <input
              type="url"
              placeholder="https://your-domain.com/webhook"
              value={settings.webhookUrl}
              onChange={(e) => setSettings({...settings, webhookUrl: e.target.value})}
              className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Rate Limit (msgs/min)</label>
            <input
              type="number"
              value={settings.rateLimit}
              onChange={(e) => setSettings({...settings, rateLimit: parseInt(e.target.value)})}
              className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Connections</label>
            <input
              type="number"
              value={settings.maxConnections}
              onChange={(e) => setSettings({...settings, maxConnections: parseInt(e.target.value)})}
              className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Bell className="text-purple-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Notifications</h2>
            <p className="text-sm text-gray-400">Manage alert preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-dark-700 rounded-lg cursor-pointer">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-gray-400">Receive alerts for message status</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
              className="w-5 h-5 rounded border-dark-600 bg-dark-600 text-green-500 focus:ring-green-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-dark-700 rounded-lg cursor-pointer">
            <div>
              <p className="font-medium">Auto Reply</p>
              <p className="text-sm text-gray-400">Automatically reply to messages</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoReply}
              onChange={(e) => setSettings({...settings, autoReply: e.target.checked})}
              className="w-5 h-5 rounded border-dark-600 bg-dark-600 text-green-500 focus:ring-green-500"
            />
          </label>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-orange-500/20 rounded-lg">
            <Shield className="text-orange-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Advanced Settings</h2>
            <p className="text-sm text-gray-400">Configure retry and timeout options</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Retry Attempts</label>
            <input
              type="number"
              value={settings.retryAttempts}
              onChange={(e) => setSettings({...settings, retryAttempts: parseInt(e.target.value)})}
              className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Session Timeout (hours)</label>
            <input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
              className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`w-full py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
          saved 
            ? 'bg-green-500 text-white' 
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {saved ? (
          '✓ Settings Saved!'
        ) : (
          <>
            <Save size={20} />
            Save Settings
          </>
        )}
      </button>
    </div>
  );
}

export default Settings;
