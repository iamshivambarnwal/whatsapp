import { useState, useEffect } from "react";
import { Activity, RefreshCw } from "lucide-react";

function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/logs');
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Activity Logs</h1>
          <p className="text-gray-400">Real-time system activity</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-xl flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl p-6 border border-dark-600">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No logs available</p>
          ) : (
            logs.map((log, index) => (
              <div key={log._id || index} className="flex items-start gap-3 p-3 bg-dark-700 rounded-xl">
                <Activity size={16} className={getTypeColor(log.type)} />
                <div className="flex-1">
                  <p className="text-sm">{log.message}</p>
                  <p className="text-xs text-gray-500">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Logs;
