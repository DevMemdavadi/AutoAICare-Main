export interface DripCampaign {
  id: number;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  contact_ids: number[];
  group_ids: number[];
  total_recipients: number;
  active_recipients: number;
  completed_recipients: number;
  failed_recipients: number;
  message_count: number;
  active_recipient_count: number;
  completed_recipient_count: number;
  messages: DripMessage[];
  recipients: DripRecipient[];
}

export interface DripMessage {
  id: number;
  campaign: number;
  sequence_number: number;
  message_type: 'text' | 'template' | 'media';
  content: string;
  template_name?: string;
  template_params: Record<string, any>;
  media_file?: string;
  delay_hours: number;
  delay_minutes: number;
  delay_days: number;
  total_delay_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DripRecipient {
  id: number;
  campaign: number;
  contact: number;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  status: 'pending' | 'active' | 'completed' | 'unsubscribed' | 'failed';
  current_message_index: number;
  last_message_sent_at?: string;
  next_message_at?: string;
  messages_sent: number;
  messages_failed: number;
  unsubscribed_at?: string;
  unsubscribe_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface DripMessageLog {
  id: number;
  campaign: number;
  recipient: number;
  message: number;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  created_at: string;
}

export interface CampaignStats {
  total_recipients: number;
  active_recipients: number;
  completed_recipients: number;
  unsubscribed_recipients: number;
  failed_recipients: number;
  total_messages_sent: number;
  total_messages_delivered: number;
  total_messages_read: number;
  total_messages_failed: number;
  delivery_rate: number;
  read_rate: number;
}

export interface CreateCampaignRequest {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  contact_ids: number[];
  group_ids: number[];
  messages: {
    sequence_number: number;
    message_type: 'text' | 'template' | 'media';
    content: string;
    template_name?: string;
    template_params?: Record<string, any>;
    media_file?: string;
    delay_hours: number;
    delay_minutes: number;
    delay_days: number;
  }[];
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}

export interface ApiResponse<T> {
  msg: string;
  meta: {
    current_page: number;
    is_next_page: boolean;
    next_page: number | null;
    total_count: number;
    total_pages: number;
  };
  data: T;
} 