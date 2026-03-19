import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserX, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { dripRecipientService } from '@/lib/dripCampaignService';

interface RecipientManagerProps {
  campaignId: number;
}

const RecipientManager: React.FC<RecipientManagerProps> = ({ campaignId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ['drip-recipients', campaignId],
    queryFn: () => dripRecipientService.getRecipients(campaignId),
  });

  const unsubscribeMutation = useMutation({
    mutationFn: dripRecipientService.unsubscribeRecipient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-recipients', campaignId] });
      toast.success('Recipient unsubscribed successfully');
    },
  });

  const filteredRecipients = recipients.filter((recipient) => {
    const matchesSearch = recipient.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipient.contact_phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || recipient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'unsubscribed': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleUnsubscribe = (recipientId: number) => {
    if (confirm('Are you sure you want to unsubscribe this recipient?')) {
      unsubscribeMutation.mutate(recipientId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recipients</CardTitle>
            <CardDescription>
              {recipients.length} recipients in this campaign
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search recipients..."
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
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Recipients Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Last Message</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecipients.map((recipient) => (
                <TableRow key={recipient.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{recipient.contact_name}</p>
                      <p className="text-sm text-gray-500">{recipient.contact_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(recipient.status)}>
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
                    <div className="text-sm">
                      <p className="text-green-600">Sent: {recipient.messages_sent}</p>
                      <p className="text-red-600">Failed: {recipient.messages_failed}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {recipient.last_message_sent_at 
                      ? formatDate(recipient.last_message_sent_at)
                      : 'Not sent yet'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Navigate to recipient logs
                          window.open(`/drip-recipients/${recipient.id}/logs`, '_blank');
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Logs
                      </Button>
                      {recipient.status !== 'unsubscribed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnsubscribe(recipient.id)}
                          disabled={unsubscribeMutation.isPending}
                        >
                          <UserX className="h-3 w-3 mr-1" />
                          Unsubscribe
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredRecipients.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No recipients found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecipientManager; 