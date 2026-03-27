import { useState } from 'react';
import { Upload, Play, Pause, Download, FileText, Users, Send, Clock, Calendar } from 'lucide-react';

const campaigns = [
  { id: 1, name: 'Summer Sale', contacts: 1250, sent: 1200, failed: 50, status: 'completed', date: 'Mar 20, 2024' },
  { id: 2, name: 'New Product Launch', contacts: 3500, sent: 2100, failed: 0, status: 'running', date: 'Mar 22, 2024' },
  { id: 3, name: 'Festival Offer', contacts: 500, sent: 0, failed: 0, status: 'draft', date: 'Not scheduled' },
];

const previewContacts = [
  { id: 1, name: 'Rahul Sharma', phone: '+91 98XXX4210', tag: 'Hot' },
  { id: 2, name: 'Priya Patel', phone: '+91 98XXX4211', tag: 'Interested' },
  { id: 3, name: 'Amit Kumar', phone: '+91 98XXX4212', tag: 'Cold' },
];

function BulkCampaign() {
  const [campaignName, setCampaignName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [schedule, setSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [message, setMessage] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const estimatedTime = selectedFile ? Math.ceil(500 / 30) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Bulk Campaign</h1>
          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-[#25D366]/20 text-[#25D366]">Mass Messaging</div>
        </div>
        <p className="text-gray-400">Create and manage mass messaging campaigns</p>
      </div>

      <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl p-6 border border-dark-600">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Send size={20} className="text-[#25D366]" />Create New Campaign
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Campaign Name</label>
              <input
                type="text"
                placeholder="e.g., Summer Sale 2024"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-[#25D366]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message Template</label>
              <textarea
                rows={4}
                placeholder="Hi {{name}}, {{message}}"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-[#25D366] resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">Use {"{{name}}"} for personalization</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Upload Contacts (CSV)</label>
              <div className="border-2 border-dashed border-dark-600 rounded-xl p-8 text-center hover:border-[#25D366] transition-all cursor-pointer">
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <Upload className="mx-auto mb-3 text-[#25D366]" size={32} />
                  {selectedFile ? (
                    <div className="text-[#25D366]">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-400">Click to upload or drag and drop</p>
                      <p className="text-sm text-gray-500 mt-1">CSV files only</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="bg-dark-700 rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={schedule}
                  onChange={(e) => setSchedule(e.target.checked)}
                  className="w-5 h-5 rounded border-dark-600 bg-dark-600 text-[#25D366]"
                />
                <Calendar size={18} className="text-gray-400" />
                <span className="font-medium">Schedule Campaign</span>
              </label>
              {schedule && (
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full mt-3 px-4 py-2 bg-dark-600 border border-dark-600 rounded-xl focus:outline-none focus:border-[#25D366]"
                />
              )}
            </div>

            <button className="w-full py-3 bg-gradient-to-r from-[#25D366] to-green-500 hover:from-[#25D366]/90 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20">
              <Play size={20} />Start Campaign
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-dark-700 rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText size={18} className="text-[#25D366]" />Campaign Preview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-dark-800 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Recipients</p>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    <Users size={20} className="text-blue-400" />{selectedFile ? '~500' : '0'}
                  </p>
                </div>
                <div className="bg-dark-800 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Est. Time</p>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    <Clock size={20} className="text-orange-400" />{estimatedTime || '0'} min
                  </p>
                </div>
              </div>
            </div>

            {selectedFile && (
              <div className="bg-dark-700 rounded-xl p-6">
                <h4 className="font-medium mb-3">First 3 Contacts:</h4>
                <div className="space-y-2">
                  {previewContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between bg-dark-800 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                          {contact.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{contact.name}</p>
                          <p className="text-xs text-gray-400">{contact.phone}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        contact.tag === 'Hot' ? 'bg-red-500/20 text-red-400' :
                        contact.tag === 'Interested' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {contact.tag}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">+497 more contacts...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl p-6 border border-dark-600">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Active Campaigns</h2>
          <button className="text-sm text-gray-400 hover:text-white flex items-center gap-2">
            <Download size={16} />Export Report
          </button>
        </div>

        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-dark-700 rounded-xl p-4 flex items-center gap-4 hover:bg-dark-600 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold">{campaign.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    campaign.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    campaign.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-400">
                  <span>📱 {campaign.contacts}</span>
                  <span>✓ {campaign.sent}</span>
                  <span>✗ {campaign.failed}</span>
                  <span>📅 {campaign.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {campaign.status === 'running' ? (
                  <button className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                    <Pause size={20} />
                  </button>
                ) : campaign.status === 'draft' ? (
                  <button className="p-2 bg-[#25D366]/20 text-[#25D366] rounded-lg hover:bg-[#25D366]/30 transition-colors">
                    <Play size={20} />
                  </button>
                ) : (
                  <button className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors">
                    <Download size={20} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BulkCampaign;
