import { useState, useEffect } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { useWhatsApp } from "../hooks/useWhatsApp.jsx";

function Chat() {
  const { isConnected } = useWhatsApp();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/messages/recent?limit=50');
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Chat</h1>
        <p className="text-gray-400">Recent messages</p>
      </div>

      <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl p-6 border border-dark-600 h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-[#25D366]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle size={48} className="mb-4" />
            <p>No messages yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, index) => (
              <div key={msg._id || index} className={`p-3 rounded-xl ${msg.direction === 'incoming' ? 'bg-dark-700 ml-4' : 'bg-[#25D366]/20 mr-4'}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm">{msg.to || msg.from || 'Unknown'}</span>
                  <span className="text-xs text-gray-500">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
                </div>
                <p className="text-sm">{msg.body || ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
