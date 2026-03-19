import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMessages } from '@/lib/whatsappService';
import { Input } from '@/components/ui/input';
import { Select } from '@radix-ui/react-select';
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AccordionContent } from '@radix-ui/react-accordion';
import { Badge } from '@/components/ui/badge';
// import { Input } from 'components/ui/input';
// import { Badge } from '@components/ui/badge';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Skeleton } from '@components/ui/Skeleton';
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from '@components/ui/accordion';
// import { getMessages, type Message } from '@lib/whatsappService';

// Define Message type (based on provided JSON)
interface Message {
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

const History = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [statuses] = useState<string[]>(['sent', 'delivered', 'read', 'failed', 'received']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 20, 50, 100];

  // Fetch messages from API when searchTerm, statusFilter, currentPage, or pageSize changes
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {
          page: currentPage,
          page_size: pageSize,
          ordering: '-timestamp', // Add ordering parameter
        };
        
        if (searchTerm) {
          params.search = searchTerm;
        }
        
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }

        console.log('Fetching messages with params:', params);
        const response = await getMessages(params);
        setMessages(response.data.data);
        setTotalMessages(response.data.meta.total_count);
        setNextPage(response.data.meta.next_page);
        setTotalPages(response.data.meta.total_pages);
        setCurrentPage(response.data.meta.current_page);
      } catch (err) {
        setError('Failed to fetch message history.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchMessages();
    }, 500); // Debounce search requests

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, statusFilter, currentPage, pageSize]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:shadow-md';
      case 'received':
        return 'bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-md';
      case 'read':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:shadow-md';
      case 'failed':
        return 'bg-red-100 text-red-800 hover:bg-red-200 hover:shadow-md';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:shadow-md';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Message History</h1>
          <p className="mt-2 text-gray-600">
            View and search through your message history
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by phone number or message content..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  console.log('Status filter changed to:', value);
                  setStatusFilter(value);
                  setCurrentPage(1); // Reset to page 1 when filter changes
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  console.log('Page size changed to:', value);
                  setPageSize(parseInt(value));
                  setCurrentPage(1); // Reset to page 1 when page size changes
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Messages ({messages.length})</CardTitle>
          <CardDescription>
            Detailed history of all WhatsApp messages
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {/* Header for the accordion list */}
            <div className="flex items-center px-6 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="w-1/6">Recipient</div>
              <div className="w-2/6">Content</div>
              <div className="w-1/6">Type</div>
              <div className="w-1/6">Status</div>
              <div className="w-1/6">Date</div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {loading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <div key={index} className="px-6 py-4 border-b">
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))
              ) : error ? (
                <div className="text-center py-10 text-red-500">{error}</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No messages found.</div>
              ) : (
                messages.map((message) => (
                  <AccordionItem value={`item-${message.id}`} key={message.id} className="border-b">
                    <AccordionTrigger className="flex items-center w-full text-left px-6 py-4 hover:bg-gray-50">
                      <div className="w-1/6 text-sm font-medium text-gray-900">{message.phone_number}</div>
                      <div className="w-2/6 text-sm text-gray-900 truncate pr-4">{message.message_content || message.template_name || 'N/A'}</div>
                      <div className="w-1/6">
                        <Badge variant="outline" className="capitalize">{message.message_type}</Badge>
                      </div>
                      <div className="w-1/6">
                        <span
                          className={`
                            ${getStatusColor(message.status)} 
                            inline-block px-3 py-1 rounded-full text-sm
                            transform transition-all duration-200 ease-in-out
                            hover:scale-105 hover:-translate-y-0.5
                            cursor-pointer
                          `}
                        >
                          {message.status}
                        </span>
                      </div>
                      <div className="w-1/6 text-sm text-gray-500">{new Date(message.timestamp).toLocaleDateString()}</div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 py-4 bg-gray-50 border-t">
                      <p className="text-sm text-gray-700"><strong>Full Content:</strong> {message.message_content || 'N/A'}</p>
                      <p className="text-sm text-gray-700 mt-2"><strong>Template:</strong> {message.template_name || 'N/A'}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))
              )}
            </Accordion>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {messages.length} of {totalMessages} messages (Page {currentPage} of {totalPages})
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!nextPage}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default History;