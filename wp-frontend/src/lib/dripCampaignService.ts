import api from './api';
import {
  DripCampaign,
  DripMessage,
  DripRecipient,
  DripMessageLog,
  CampaignStats,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  ApiResponse,
} from './types';

// Drip Campaigns
export const dripCampaignService = {
  // List all campaigns
  getCampaigns: async (): Promise<DripCampaign[]> => {
    const response = await api.get<ApiResponse<DripCampaign[]>>('/whatsapp/dashboard/drip-campaigns/');
    return response.data.data;
  },

  // Get single campaign
  getCampaign: async (id: number): Promise<DripCampaign> => {
    const response = await api.get<ApiResponse<DripCampaign>>(`/whatsapp/dashboard/drip-campaigns/${id}/`);
    return response.data.data;
  },

  // Create campaign
  createCampaign: async (data: CreateCampaignRequest): Promise<DripCampaign> => {
    const response = await api.post<ApiResponse<DripCampaign>>('/whatsapp/dashboard/drip-campaigns/', data);
    return response.data.data;
  },

  // Update campaign
  updateCampaign: async (id: number, data: UpdateCampaignRequest): Promise<DripCampaign> => {
    const response = await api.patch<ApiResponse<DripCampaign>>(`/whatsapp/dashboard/drip-campaigns/${id}/`, data);
    return response.data.data;
  },

  // Delete campaign
  deleteCampaign: async (id: number): Promise<void> => {
    await api.delete(`/whatsapp/dashboard/drip-campaigns/${id}/`);
  },

  // Campaign actions
  activateCampaign: async (id: number): Promise<void> => {
    await api.post(`/api/whatsapp/dashboard/drip-campaigns/${id}/activate/`);
  },

  pauseCampaign: async (id: number): Promise<void> => {
    await api.post(`/api/whatsapp/dashboard/drip-campaigns/${id}/pause/`);
  },

  resumeCampaign: async (id: number): Promise<void> => {
    await api.post(`/api/whatsapp/dashboard/drip-campaigns/${id}/resume/`);
  },

  cancelCampaign: async (id: number): Promise<void> => {
    await api.post(`/api/whatsapp/dashboard/drip-campaigns/${id}/cancel/`);
  },

  // Get campaign stats
  getCampaignStats: async (id: number): Promise<CampaignStats> => {
    const response = await api.get<ApiResponse<CampaignStats>>(`/api/whatsapp/dashboard/drip-campaigns/${id}/stats/`);
    return response.data.data;
  },

  // Get campaign recipients
  getCampaignRecipients: async (id: number): Promise<DripRecipient[]> => {
    const response = await api.get<ApiResponse<DripRecipient[]>>(`/api/whatsapp/dashboard/drip-campaigns/${id}/recipients/`);
    return response.data.data;
  },

  // Get campaign message logs
  getCampaignMessageLogs: async (id: number): Promise<DripMessageLog[]> => {
    const response = await api.get<ApiResponse<DripMessageLog[]>>(`/api/whatsapp/dashboard/drip-campaigns/${id}/message_logs/`);
    return response.data.data;
  },
};

// Drip Messages
export const dripMessageService = {
  // List messages (with optional campaign filter)
  getMessages: async (campaignId?: number): Promise<DripMessage[]> => {
    const params = campaignId ? { campaign: campaignId } : {};
    const response = await api.get<ApiResponse<DripMessage[]>>('/drip-messages/', { params });
    return response.data.data;
  },

  // Get single message
  getMessage: async (id: number): Promise<DripMessage> => {
    const response = await api.get<ApiResponse<DripMessage>>(`/drip-messages/${id}/`);
    return response.data.data;
  },

  // Create message
  createMessage: async (data: Omit<DripMessage, 'id' | 'created_at' | 'updated_at'>): Promise<DripMessage> => {
    const response = await api.post<ApiResponse<DripMessage>>('/drip-messages/', data);
    return response.data.data;
  },

  // Update message
  updateMessage: async (id: number, data: Partial<DripMessage>): Promise<DripMessage> => {
    const response = await api.patch<ApiResponse<DripMessage>>(`/drip-messages/${id}/`, data);
    return response.data.data;
  },

  // Delete message
  deleteMessage: async (id: number): Promise<void> => {
    await api.delete(`/drip-messages/${id}/`);
  },
};

// Drip Recipients
export const dripRecipientService = {
  // List recipients (with optional campaign filter)
  getRecipients: async (campaignId?: number): Promise<DripRecipient[]> => {
    const params = campaignId ? { campaign: campaignId } : {};
    const response = await api.get<ApiResponse<DripRecipient[]>>('/api/whatsapp/dashboard/drip-recipients/', { params });
    return response.data.data;
  },

  // Get single recipient
  getRecipient: async (id: number): Promise<DripRecipient> => {
    const response = await api.get<ApiResponse<DripRecipient>>(`/api/whatsapp/dashboard/drip-recipients/${id}/`);
    return response.data.data;
  },

  // Unsubscribe recipient
  unsubscribeRecipient: async (id: number): Promise<void> => {
    await api.post(`/api/whatsapp/dashboard/drip-recipients/${id}/unsubscribe/`);
  },

  // Get recipient message logs
  getRecipientMessageLogs: async (id: number): Promise<DripMessageLog[]> => {
    const response = await api.get<ApiResponse<DripMessageLog[]>>(`/api/whatsapp/dashboard/drip-recipients/${id}/message_logs/`);
    return response.data.data;
  },
}; 