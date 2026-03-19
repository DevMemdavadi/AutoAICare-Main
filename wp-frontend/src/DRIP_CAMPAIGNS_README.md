# WhatsApp Drip Campaigns UI

This document describes the implementation of the WhatsApp Drip Campaigns feature in the Yogi Sarbat Admin Hub.

## Overview

The Drip Campaigns feature allows users to create, manage, and monitor automated WhatsApp message sequences. Users can set up campaigns with multiple messages that are sent to recipients over time with configurable delays.

## Features Implemented

### 1. Campaign Management
- **List Campaigns**: View all campaigns with status, dates, and key metrics
- **Create Campaign**: Form to create new campaigns with message sequences
- **Campaign Details**: Detailed view with stats, recipients, and message logs
- **Campaign Actions**: Activate, pause, resume, and cancel campaigns

### 2. Message Sequence Management
- **Multiple Message Types**: Text, template, and media messages
- **Configurable Delays**: Set delays between messages in hours
- **Message Ordering**: Automatic ordering of messages in sequence

### 3. Recipient Management
- **Contact Selection**: Choose individual contacts or groups
- **Progress Tracking**: Monitor each recipient's progress through the campaign
- **Status Management**: View recipient status (pending, active, completed, unsubscribed, failed)
- **Manual Actions**: Unsubscribe recipients manually

### 4. Analytics & Monitoring
- **Campaign Stats**: Delivery rates, read rates, message counts
- **Progress Visualization**: Progress bars and status indicators
- **Message Logs**: Detailed logs of all message deliveries
- **Real-time Updates**: Live status updates using React Query

## File Structure

```
src/
├── lib/
│   ├── types.ts                    # TypeScript interfaces
│   ├── dripCampaignService.ts      # API service functions
│   └── api.ts                      # Base API configuration
├── pages/
│   ├── DripCampaigns.tsx           # Main campaigns list page
│   ├── CreateDripCampaign.tsx      # Campaign creation form
│   └── CampaignDetails.tsx         # Campaign details and management
├── components/
│   └── RecipientManager.tsx        # Recipient management component
└── App.tsx                         # Updated with new routes
```

## API Integration

The UI integrates with the Django REST API endpoints:

### Campaign Endpoints
- `GET /drip-campaigns/` - List all campaigns
- `POST /drip-campaigns/` - Create new campaign
- `GET /drip-campaigns/{id}/` - Get campaign details
- `PATCH /drip-campaigns/{id}/` - Update campaign
- `DELETE /drip-campaigns/{id}/` - Delete campaign

### Campaign Actions
- `POST /api/whatsapp/dashboard/drip-campaigns/{id}/activate/` - Activate campaign
- `POST /api/whatsapp/dashboard/drip-campaigns/{id}/pause/` - Pause campaign
- `POST /api/whatsapp/dashboard/drip-campaigns/{id}/resume/` - Resume campaign
- `POST /api/whatsapp/dashboard/drip-campaigns/{id}/cancel/` - Cancel campaign

### Analytics Endpoints
- `GET /api/whatsapp/dashboard/drip-campaigns/{id}/stats/` - Campaign statistics
- `GET /api/whatsapp/dashboard/drip-campaigns/{id}/recipients/` - Campaign recipients
- `GET /api/whatsapp/dashboard/drip-campaigns/{id}/message_logs/` - Message logs

### Recipient Management
- `GET /api/whatsapp/dashboard/drip-recipients/` - List recipients
- `POST /api/whatsapp/dashboard/drip-recipients/{id}/unsubscribe/` - Unsubscribe recipient
- `GET /api/whatsapp/dashboard/drip-recipients/{id}/message_logs/` - Recipient logs

## Key Components

### DripCampaigns.tsx
Main page that displays all campaigns in a card-based layout with:
- Search and filtering capabilities
- Status badges and progress indicators
- Quick action buttons (activate, pause, resume)
- Campaign statistics overview

### CreateDripCampaign.tsx
Comprehensive form for creating new campaigns:
- Basic campaign information (name, description, dates)
- Contact and group selection
- Dynamic message sequence builder
- Message type selection (text, template, media)
- Delay configuration between messages

### CampaignDetails.tsx
Detailed campaign view with tabs for:
- **Overview**: Campaign stats and progress
- **Recipients**: Recipient management with filtering
- **Message Logs**: Detailed delivery logs

### RecipientManager.tsx
Reusable component for managing campaign recipients:
- Search and filter recipients
- Status tracking and progress visualization
- Manual unsubscribe functionality
- Link to individual recipient logs

## Data Models

### DripCampaign
```typescript
interface DripCampaign {
  id: number;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
}
```

### DripMessage
```typescript
interface DripMessage {
  id: number;
  campaign: number;
  order: number;
  message_type: 'text' | 'template' | 'media';
  content: string;
  template_name?: string;
  media_url?: string;
  delay_hours: number;
  created_at: string;
  updated_at: string;
}
```

### DripRecipient
```typescript
interface DripRecipient {
  id: number;
  campaign: number;
  contact: {
    id: number;
    name: string;
    phone_number: string;
  };
  status: 'pending' | 'active' | 'completed' | 'unsubscribed' | 'failed';
  current_message_index: number;
  last_message_sent_at?: string;
  subscribed_at: string;
  unsubscribed_at?: string;
  created_at: string;
  updated_at: string;
}
```

## State Management

The application uses React Query for server state management:
- Automatic caching and background updates
- Optimistic updates for better UX
- Error handling and retry logic
- Loading states and skeleton screens

## UI/UX Features

### Modern Design
- Clean, card-based layout
- Consistent color scheme with status indicators
- Responsive design for mobile and desktop
- Loading states and error handling

### User Experience
- Intuitive navigation with breadcrumbs
- Search and filtering capabilities
- Progress visualization with progress bars
- Status badges for quick identification
- Confirmation dialogs for destructive actions

### Accessibility
- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly
- High contrast status indicators

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Access the Application**
   - Navigate to `http://localhost:8080`
   - Go to "Drip Campaigns" in the sidebar
   - Create your first campaign or view existing ones

## Future Enhancements

### Planned Features
- **Campaign Templates**: Save and reuse campaign configurations
- **Advanced Analytics**: Charts and graphs for campaign performance
- **A/B Testing**: Test different message sequences
- **Bulk Actions**: Manage multiple campaigns simultaneously
- **Export Functionality**: Export campaign data and reports

### Technical Improvements
- **Real-time Updates**: WebSocket integration for live updates
- **Offline Support**: Service worker for offline functionality
- **Performance Optimization**: Virtual scrolling for large datasets
- **Internationalization**: Multi-language support

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Check if the Django backend is running
   - Verify API URL configuration in `lib/api.ts`
   - Ensure authentication tokens are valid

2. **TypeScript Errors**
   - Run `npm run type-check` to identify issues
   - Check import paths and ensure all dependencies are installed

3. **Build Issues**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check for conflicting dependencies

### Development Tips

- Use React Query DevTools for debugging API calls
- Check browser console for detailed error messages
- Use the Network tab to monitor API requests
- Test on different screen sizes for responsive design

## Contributing

When contributing to the Drip Campaigns feature:

1. Follow the existing code style and patterns
2. Add TypeScript types for all new interfaces
3. Include error handling for all API calls
4. Test on both desktop and mobile devices
5. Update this documentation for any new features

## Support

For issues or questions about the Drip Campaigns feature:
- Check the browser console for error messages
- Review the API documentation
- Contact the development team 