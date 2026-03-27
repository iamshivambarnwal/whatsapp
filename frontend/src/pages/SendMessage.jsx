import { useState } from "react";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { useWhatsApp } from "../hooks/useWhatsApp.jsx";

function SendMessage() {
  const { isConnected } = useWhatsApp();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!phone || !message) {
      setError("Please enter both phone and message");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch('http://localhost:3000/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: phone, message })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Message queued for ${phone}`);
        setPhone("");
        setMessage("");
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Send Message</h1>
        <p className="text-gray-400">Send a single WhatsApp message</p>
      </div>

      <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl p-6 border border-dark-600">
        {!isConnected && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <p className="text-yellow-400 text-sm">⚠️ WhatsApp is not connected. Messages will be queued.</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 focus:outline-none focus:border-[#25D366]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              rows={5}
              className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 focus:outline-none focus:border-[#25D366] resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#25D366] to-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={20} />
                Send Message
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SendMessage;
