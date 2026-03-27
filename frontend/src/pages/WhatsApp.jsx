import { useEffect, useState } from 'react';
import { RefreshCw, Wifi, WifiOff, QrCode } from 'lucide-react';
import useAppStore from '../stores/appStore';
import { whatsappAPI } from '../services/api';

export default function WhatsApp() {
  const { waStatus, qrCode, loadingWA, fetchWhatsAppStatus } = useAppStore();
  const [polling, setPolling] = useState(false);
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    if (connecting) return; // Prevent double-click
    setConnecting(true);
    try {
      await whatsappAPI.connect();
      setPolling(true);
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await whatsappAPI.disconnect();
    fetchWhatsAppStatus();
  }

  useEffect(() => {
    fetchWhatsAppStatus();
  }, []);

  // Poll for QR / connected status every 3s while connecting
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchWhatsAppStatus, 3000);
    return () => clearInterval(interval);
  }, [polling]);

  const connected = waStatus?.connected;
  const hasQR = !!qrCode;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">WhatsApp</h1>
        <p className="text-gray-500 text-sm mt-0.5">Connect your WhatsApp account</p>
      </div>

      {/* Status card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
          connected ? 'bg-green-500/10' : 'bg-gray-800'
        }`}>
          {connected
            ? <Wifi size={28} className="text-green-400" />
            : <WifiOff size={28} className="text-gray-500" />}
        </div>

        <h2 className="text-lg font-semibold mb-1">
          {connected ? 'WhatsApp Connected' : 'Not Connected'}
        </h2>
        <p className="text-gray-500 text-sm">
          {connected
            ? 'Your account is ready to send messages'
            : 'Scan the QR code to connect your WhatsApp'}
        </p>
      </div>

      {/* QR Code */}
      {!connected && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          {hasQR ? (
            <>
              <div className="flex items-center gap-2 justify-center mb-4">
                <QrCode size={16} className="text-gray-400" />
                <p className="text-sm text-gray-400">Scan with WhatsApp</p>
              </div>
              <img
                src={qrCode}
                alt="WhatsApp QR"
                className="mx-auto rounded-lg border border-gray-700"
                style={{ maxWidth: 240 }}
              />
              <p className="text-xs text-gray-600 mt-3">Expires in 60 seconds — auto-refreshes</p>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loadingWA}
              className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-900 font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              {loadingWA ? 'Initializing...' : 'Generate QR Code'}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!connected ? (
          <button
            onClick={handleConnect}
            className="flex-1 bg-green-500 hover:bg-green-400 text-gray-900 font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <QrCode size={14} />
            Connect WhatsApp
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Disconnect
          </button>
        )}
        <button
          onClick={fetchWhatsAppStatus}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-sm font-medium mb-3">How to connect</p>
        <ol className="space-y-2 text-xs text-gray-400">
          <li className="flex gap-2">
            <span className="text-green-400 font-bold">1.</span>
            Click "Connect WhatsApp" above
          </li>
          <li className="flex gap-2">
            <span className="text-green-400 font-bold">2.</span>
            Open WhatsApp on your phone
          </li>
          <li className="flex gap-2">
            <span className="text-green-400 font-bold">3.</span>
            Go to Settings → Linked Devices → Link a Device
          </li>
          <li className="flex gap-2">
            <span className="text-green-400 font-bold">4.</span>
            Scan the QR code
          </li>
        </ol>
      </div>
    </div>
  );
}
