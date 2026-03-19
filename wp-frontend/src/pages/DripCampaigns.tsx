import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Play, Pause, RotateCcw, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { dripCampaignService } from '@/lib/dripCampaignService';

const DripCampaigns: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['drip-campaigns'],
    queryFn: dripCampaignService.getCampaigns,
  });

  const activateMutation = useMutation({
    mutationFn: dripCampaignService.activateCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-campaigns'] });
      toast.success('Campaign activated successfully');
    },
  });

  const pauseMutation = useMutation({
    mutationFn: dripCampaignService.pauseCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-campaigns'] });
      toast.success('Campaign paused successfully');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: dripCampaignService.resumeCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-campaigns'] });
      toast.success('Campaign resumed successfully');
    },
  });

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate total messages sent across all recipients
  const getTotalMessagesSent = (campaign: any) => {
    return campaign.recipients?.reduce((total: number, recipient: any) => {
      return total + (recipient.messages_sent || 0);
    }, 0) || 0;
  };

  // Calculate total messages failed across all recipients
  const getTotalMessagesFailed = (campaign: any) => {
    return campaign.recipients?.reduce((total: number, recipient: any) => {
      return total + (recipient.messages_failed || 0);
    }, 0) || 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drip Campaigns</h1>
          <p className="text-gray-600">Manage your automated WhatsApp message sequences</p>
        </div>
        <Link to="/drip-campaigns/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCampaigns.map((campaign) => {
          const totalMessagesSent = getTotalMessagesSent(campaign);
          const totalMessagesFailed = getTotalMessagesFailed(campaign);
          const totalMessages = campaign.message_count || 0;
          const totalRecipients = campaign.total_recipients || 0;
          const progressPercentage = totalRecipients > 0 && totalMessages > 0 
            ? Math.round((totalMessagesSent / (totalRecipients * totalMessages)) * 100)
            : 0;

          return (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                      {campaign.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {campaign.description}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/drip-campaigns/${campaign.id}`}>View Details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/drip-campaigns/${campaign.id}/edit`}>Edit</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatDate(campaign.created_at)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="text-gray-900 font-medium">
                      {progressPercentage}%
                    </span>
                  </div>
                  <Progress 
                    value={progressPercentage} 
                    className="h-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Recipients</p>
                    <p className="font-semibold text-gray-900">{totalRecipients}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Messages</p>
                    <p className="font-semibold text-gray-900">{totalMessages}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Sent</p>
                    <p className="font-semibold text-green-600">{totalMessagesSent}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Failed</p>
                    <p className="font-semibold text-red-600">{totalMessagesFailed}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/drip-campaigns/${campaign.id}`}>
                      View Details
                    </Link>
                  </Button>
                  {campaign.status === 'draft' && (
                    <Button
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => activateMutation.mutate(campaign.id)}
                      disabled={activateMutation.isPending}
                    >
                      <Play className="h-3 w-3" />
                      Activate
                    </Button>
                  )}
                  {campaign.status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                      onClick={() => pauseMutation.mutate(campaign.id)}
                      disabled={pauseMutation.isPending}
                    >
                      <Pause className="h-3 w-3" />
                      Pause
                    </Button>
                  )}
                  {campaign.status === 'paused' && (
                    <Button
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => resumeMutation.mutate(campaign.id)}
                      disabled={resumeMutation.isPending}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Resume
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first drip campaign.
          </p>
          <div className="mt-6">
            <Link to="/drip-campaigns/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default DripCampaigns; 