import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, Pause, RotateCcw, X, Users, MessageSquare, BarChart3, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { dripCampaignService, dripRecipientService } from '@/lib/dripCampaignService';
import { CampaignStats, DripRecipient, DripMessageLog } from '@/lib/types';

const DripCampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const campaignId = parseInt(id!);

  // Fetch campaign data
  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ['drip-campaign', campaignId],
    queryFn: () => dripCampaignService.getCampaign(campaignId),
    enabled: !!campaignId,
  });

  // Fetch campaign stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['drip-campaign-stats', campaignId],
    queryFn: () => dripCampaignService.getCampaignStats(campaignId),
    enabled: !!campaignId,
  });

  // Fetch campaign recipients
  const { data: recipients = [], isLoading: recipientsLoading } = useQuery({
    queryKey: ['drip-campaign-recipients', campaignId],
    queryFn: () => dripCampaignService.getCampaignRecipients(campaignId),
    enabled: !!campaignId,
  });

  // Fetch campaign message logs
  const { data: messageLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['drip-campaign-logs', campaignId],
    queryFn: () => dripCampaignService.getCampaignMessageLogs(campaignId),
    enabled: !!campaignId,
  });

  // Campaign actions
  const activateMutation = useMutation({
    mutationFn: dripCampaignService.activateCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-campaign', campaignId] });
      toast.success('Campaign activated successfully');
    },
  });

  const pauseMutation = useMutation({
    mutationFn: dripCampaignService.pauseCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-campaign', campaignId] });
      toast.success('Campaign paused successfully');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: dripCampaignService.resumeCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-campaign', campaignId] });
      toast.success('Campaign resumed successfully');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: dripCampaignService.cancelCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-campaign', campaignId] });
      toast.success('Campaign cancelled successfully');
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: dripRecipientService.unsubscribeRecipient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-campaign-recipients', campaignId] });
      toast.success('Recipient unsubscribed successfully');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecipientStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'unsubscribed': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLogStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-purple-100 text-purple-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Campaign not found</h3>
        <Button onClick={() => navigate('/drip-campaigns')} className="mt-4">
          Back to Campaigns
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/drip-campaigns')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <p className="text-gray-600">{campaign.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(campaign.status)}>
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </Badge>
          {campaign.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => activateMutation.mutate(campaignId)}
              disabled={activateMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              Activate
            </Button>
          )}
          {campaign.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => pauseMutation.mutate(campaignId)}
              disabled={pauseMutation.isPending}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          {campaign.status === 'paused' && (
            <Button
              size="sm"
              onClick={() => resumeMutation.mutate(campaignId)}
              disabled={resumeMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
          {['draft', 'active', 'paused'].includes(campaign.status) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => cancelMutation.mutate(campaignId)}
              disabled={cancelMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_recipients}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_messages_sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.delivery_rate.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Read Rate</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.read_rate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
          <TabsTrigger value="logs">Message Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Progress</span>
                    <span>
                      {stats ? Math.round((stats.total_messages_sent / (stats.total_recipients * 5)) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={stats ? (stats.total_messages_sent / (stats.total_recipients * 5)) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Active Recipients</p>
                    <p className="font-semibold">{stats?.active_recipients || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Completed</p>
                    <p className="font-semibold">{stats?.completed_recipients || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Unsubscribed</p>
                    <p className="font-semibold">{stats?.unsubscribed_recipients || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Failed</p>
                    <p className="font-semibold">{stats?.failed_recipients || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="font-medium">{formatDate(campaign.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">End Date</p>
                  <p className="font-medium">{formatDate(campaign.end_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">{formatDate(campaign.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-medium">{formatDate(campaign.updated_at)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recipients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Recipients</CardTitle>
              <CardDescription>
                {recipients.length} recipients in this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Last Message</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{recipient.contact.name}</p>
                          <p className="text-sm text-gray-500">{recipient.contact.phone_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRecipientStatusColor(recipient.status)}>
                          {recipient.status.charAt(0).toUpperCase() + recipient.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={(recipient.current_message_index / 5) * 100} className="w-20 h-2" />
                          <span className="text-sm">{recipient.current_message_index}/5</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {recipient.last_message_sent_at 
                          ? formatDate(recipient.last_message_sent_at)
                          : 'Not sent yet'
                        }
                      </TableCell>
                      <TableCell>
                        {recipient.status !== 'unsubscribed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unsubscribeMutation.mutate(recipient.id)}
                            disabled={unsubscribeMutation.isPending}
                          >
                            Unsubscribe
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Logs</CardTitle>
              <CardDescription>
                {messageLogs.length} message logs in this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Delivered At</TableHead>
                    <TableHead>Read At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messageLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">Recipient #{log.recipient}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">Message #{log.message}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getLogStatusColor(log.status)}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(log.sent_at)}</TableCell>
                      <TableCell>
                        {log.delivered_at ? formatDate(log.delivered_at) : '-'}
                      </TableCell>
                      <TableCell>
                        {log.read_at ? formatDate(log.read_at) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DripCampaignDetails; 