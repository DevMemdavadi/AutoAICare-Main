import api from './api';

// Types for Message History
export interface Message {
  id: number;
  phone_number: string;
  message_type: string;
  message_content: string | null;
  template_name: string | null;
  message_id: string | null;
  status: string;
  status_updated_at: string;
  timestamp: string;
}

export interface MessagesApiResponse {
  msg: string;
  meta: {
    current_page: number;
    is_next_page: boolean;
    next_page: string | null;
    total_count: number;
    total_pages: number;
  };
  data: Message[];
}

// Types for Dashboard Stats
interface Stat {
    value: number;
    change: number;
}

export interface DashboardStats {
    total_messages: Stat;
    sent: Stat;
    delivered: Stat;
    failed: Stat;
}

/**
 * Fetches the message history with pagination and filtering.
 * @param params - Query parameters for filtering and pagination.
 * @returns A promise with the message history API response.
 */
export const getMessages = (params: Record<string, string | number>) => {
  return api.get<MessagesApiResponse>('/whatsapp/dashboard/messages-list/', { params });
};

/**
 * Fetches the overview stats for the dashboard.
 * @returns A promise with the dashboard stats.
 */
export const getDashboardStats = () => {
  return api.get<DashboardStats>('/whatsapp/dashboard/stats/overview/');
};

