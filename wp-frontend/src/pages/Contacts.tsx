import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import {
  Edit,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const Contacts = () => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    email: "",
    group: "General",
  });
  const [ordering, setOrdering] = useState<"name" | "-name">("name");
  const type = "web";
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchParam, setSearchParam] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5; // Fixed by backend
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<any | null>(null);

  const getPageFromUrl = (url: string | null) => {
    if (!url) return null;
    const match = url.match(/[?&]page=(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const getPageSizeFromUrl = (url: string | null) => {
    if (!url) return null;
    const match = url.match(/[?&]page_size=(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchParam(searchTerm);
      setCurrentUrl(null);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const buildBaseUrl = () => {
    const params = new URLSearchParams({
      type,
      ordering,
    });
    if (searchParam) params.append("search", searchParam);
    return `/whatsapp/dashboard/contacts/?${params.toString()}`;
  };

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = currentUrl || buildBaseUrl();
      const response = await api.get(url);
      const data = response.data;
      const mappedContacts = (data.results || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        phone: item.phone_number || "",
        email: item.email || "",
        group:
          item.groups && item.groups.length > 0
            ? item.groups.join(", ")
            : "General",
        status: item.status || "inactive",
        lastMessage: item.last_message_at
          ? new Date(item.last_message_at).toISOString().split("T")[0]
          : "",
      }));
      setContacts(mappedContacts);
      setTotalCount(data.count || 0);
      setNextUrl(data.next);
      setPrevUrl(data.previous);
      let page = 1;
      if (data.next) {
        const nextPage = getPageFromUrl(data.next);
        if (nextPage) page = nextPage - 1;
      } else if (data.previous) {
        const prevPage = getPageFromUrl(data.previous);
        if (prevPage) page = prevPage + 1;
      }
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message || "Error fetching contacts");
    } finally {
      setLoading(false);
    }
  }, [currentUrl, ordering, searchParam]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    setCurrentUrl(null);
  }, [searchParam, ordering]);

  const handleCreateContact = useCallback(async () => {
    try {
      await api.post('/whatsapp/dashboard/contacts/', {
        name: newContact.name,
        phone_number: newContact.phone,
        email: newContact.email,
        status: 'active',
        group_ids: [],
      });
      setIsCreateDialogOpen(false);
      setNewContact({ name: '', phone: '', email: '', group: 'General' });
      setCurrentUrl(null);
      fetchContacts();
    } catch (err: any) {
      // Optionally handle error
    }
  }, [newContact, fetchContacts]);

  const handleEditContact = useCallback(async () => {
    if (!editContact) return;
    try {
      await api.put(`/whatsapp/dashboard/contacts/${editContact.id}/`, {
        name: editContact.name,
        phone_number: editContact.phone,
        email: editContact.email,
        status: editContact.status || 'active',
        group_ids: [],
      });
      setIsEditDialogOpen(false);
      setEditContact(null);
      setCurrentUrl(null);
      fetchContacts();
    } catch (err: any) {
      // Optionally handle error
    }
  }, [editContact, fetchContacts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-2 text-gray-600">
            Manage your WhatsApp contact list
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newContact.name}
                  onChange={(e) =>
                    setNewContact({ ...newContact, name: e.target.value })
                  }
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={newContact.phone}
                  onChange={(e) =>
                    setNewContact({ ...newContact, phone: e.target.value })
                  }
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) =>
                    setNewContact({ ...newContact, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group">Group</Label>
                <Input
                  id="group"
                  value={newContact.group}
                  onChange={(e) =>
                    setNewContact({ ...newContact, group: e.target.value })
                  }
                  placeholder="Customer group"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateContact}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Add Contact
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div>
          <label className="text-sm font-medium mr-2">Order by Name:</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={ordering}
            onChange={e => setOrdering(e.target.value as 'name' | '-name')}
          >
            <option value="name">A-Z</option>
            <option value="-name">Z-A</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {contacts.length}
            </div>
            <div className="text-sm text-gray-600">Total Contacts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {contacts.filter((c) => c.status === "active").length}
            </div>
            <div className="text-sm text-gray-600">Active Contacts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {new Set(contacts.map((c) => c.group)).size}
            </div>
            <div className="text-sm text-gray-600">Contact Groups</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">85%</div>
            <div className="text-sm text-gray-600">Response Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search contacts by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contacts ({totalCount})
          </CardTitle>
          <CardDescription>
            Manage and organize your contact list
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Loading contacts...
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : contacts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No contacts found.
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <div key={contact.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {contact.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-lg font-semibold text-gray-900">
                              {contact.name}
                            </p>
                            <Badge
                              variant={
                                contact.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {contact.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </div>
                            {contact.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </div>
                            )}
                          </div>
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              {contact.group}
                            </Badge>
                            <span className="ml-2 text-xs text-gray-400">
                              Last message: {contact.lastMessage}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditContact(contact);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center p-4 border-t bg-gray-50">
                <button
                  className="px-3 py-1 rounded border bg-white disabled:opacity-50"
                  onClick={() => setCurrentUrl(prevUrl)}
                  disabled={!prevUrl || currentPage <= 1}
                >
                  Previous
                </button>
                <span>Page {currentPage} of {Math.max(1, Math.ceil(totalCount / pageSize))}</span>
                <button
                  className="px-3 py-1 rounded border bg-white disabled:opacity-50"
                  onClick={() => {
                    if (currentPage < Math.max(1, Math.ceil(totalCount / pageSize))) {
                      setCurrentUrl(nextUrl);
                    }
                  }}
                  disabled={!nextUrl || currentPage >= Math.max(1, Math.ceil(totalCount / pageSize))}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogTrigger asChild></DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editContact?.name || ''}
                onChange={e => setEditContact((prev: any) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={editContact?.phone || ''}
                onChange={e => setEditContact((prev: any) => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email (Optional)</Label>
              <Input
                id="edit-email"
                type="email"
                value={editContact?.email || ''}
                onChange={e => setEditContact((prev: any) => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-group">Group</Label>
              <Input
                id="edit-group"
                value={editContact?.group || ''}
                onChange={e => setEditContact((prev: any) => ({ ...prev, group: e.target.value }))}
                placeholder="Customer group"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleEditContact}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contacts;
