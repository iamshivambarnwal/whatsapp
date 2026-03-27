import { create } from 'zustand';
import { messagesAPI, campaignsAPI, contactsAPI, usageAPI } from '../services/api';

const useAppStore = create((set, get) => ({
  // Stats
  stats: null,
  queueStats: null,
  loadingStats: false,

  // WhatsApp status
  waStatus: null,
  qrCode: null,
  loadingWA: false,

  // Campaigns
  campaigns: [],
  loadingCampaigns: false,

  // Contacts
  contacts: [],
  loadingContacts: false,

  // Messages
  messages: [],
  loadingMessages: false,
  messageFilter: { status: null, limit: 50 },

  // Usage
  usage: null,

  // --- Actions ---
  fetchStats: async () => {
    set({ loadingStats: true });
    try {
      const { data } = await messagesAPI.stats();
      set({ stats: data, loadingStats: false });
    } catch { set({ loadingStats: false }); }
  },

  fetchWhatsAppStatus: async () => {
    set({ loadingWA: true });
    try {
      const { data } = await messagesAPI.queue();
      set({ queueStats: data });
    } catch {}
    try {
      const { data } = await import('../services/api').then(m => m.whatsappAPI.status());
      set({ waStatus: data, qrCode: data.qr, loadingWA: false });
    } catch { set({ loadingWA: false }); }
  },

  connectWhatsApp: async () => {
    await import('../services/api').then(m => m.whatsappAPI.connect());
    set({ loadingWA: true });
  },

  fetchCampaigns: async () => {
    set({ loadingCampaigns: true });
    try {
      const { data } = await campaignsAPI.list();
      set({ campaigns: data.campaigns || [], loadingCampaigns: false });
    } catch { set({ loadingCampaigns: false }); }
  },

  createCampaign: async (campaignData) => {
    const { data } = await campaignsAPI.create(campaignData);
    set((s) => ({ campaigns: [data.campaign, ...s.campaigns] }));
    return data.campaign;
  },

  startCampaign: async (id) => {
    await campaignsAPI.start(id);
    get().fetchCampaigns();
  },

  pauseCampaign: async (id) => {
    await campaignsAPI.pause(id);
    get().fetchCampaigns();
  },

  fetchContacts: async (params = {}) => {
    set({ loadingContacts: true });
    try {
      const { data } = await contactsAPI.list(params);
      set({ contacts: data.contacts || [], loadingContacts: false });
    } catch { set({ loadingContacts: false }); }
  },

  uploadContacts: async (contacts) => {
    const { data } = await contactsAPI.upload(contacts);
    get().fetchContacts();
    return data;
  },

  fetchMessages: async (filter = {}) => {
    set({ loadingMessages: true });
    try {
      const { data } = await messagesAPI.logs(filter);
      set({ messages: data.messages || [], loadingMessages: false });
    } catch { set({ loadingMessages: false }); }
  },

  sendMessage: async (msgData) => {
    await messagesAPI.send(msgData);
    get().fetchMessages();
    get().fetchStats();
  },

  fetchUsage: async () => {
    try {
      const { data } = await usageAPI.me();
      set({ usage: data });
    } catch {}
  },
}));

export default useAppStore;
