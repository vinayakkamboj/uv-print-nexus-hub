import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Eye, Mail, Phone, Building, Package, History, User } from "lucide-react";
import { collection, getDocs, doc, updateDoc, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SimpleOrderData } from "@/lib/invoice-service";
import { fetchAllUsers } from "@/lib/admin-service";
import type { UserProfile } from "@/lib/admin-service";

interface UserData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  gstNumber?: string;
  address?: string;
  createdAt: any;
  lastLogin?: any;
  totalOrders?: number;
  totalSpent?: number;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      const usersData = await fetchAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.gstNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800" },
      pending_payment: { color: "bg-orange-100 text-orange-800" },
      received: { color: "bg-blue-100 text-blue-800" },
      processing: { color: "bg-purple-100 text-purple-800" },
      shipped: { color: "bg-indigo-100 text-indigo-800" },
      delivered: { color: "bg-green-100 text-green-800" },
      completed: { color: "bg-green-100 text-green-800" },
      cancelled: { color: "bg-red-100 text-red-800" },
      failed: { color: "bg-red-100 text-red-800" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge className={config.color}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </CardTitle>
        <CardDescription>
          Manage customer accounts - view profiles, order history, and user details
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="search">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by name, email, phone, or GST number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Name</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[120px]">Phone</TableHead>
                  <TableHead className="min-w-[150px]">GST Number</TableHead>
                  <TableHead className="min-w-[80px]">Orders</TableHead>
                  <TableHead className="min-w-[100px]">Total Spent</TableHead>
                  <TableHead className="min-w-[100px]">Joined</TableHead>
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium text-blue-600">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium truncate">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="truncate">{user.phone}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.gstNumber ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Building className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="font-mono text-sm truncate">{user.gstNumber}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {user.totalOrders}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ₹{user.totalSpent.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.createdAt ? 
                        new Date(user.createdAt.seconds ? user.createdAt.seconds * 1000 : user.createdAt).toLocaleDateString() 
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <User className="h-5 w-5" />
                              User Profile - {selectedUser?.name}
                            </DialogTitle>
                            <DialogDescription>
                              Complete profile and order history for {selectedUser?.name}
                            </DialogDescription>
                          </DialogHeader>
                          {selectedUser && (
                            <Tabs defaultValue="profile" className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="profile">Profile Information</TabsTrigger>
                                <TabsTrigger value="orders">Order History ({selectedUser.totalOrders})</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="profile" className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <Label>Full Name</Label>
                                    <p className="font-medium">{selectedUser.name}</p>
                                  </div>  
                                  <div>
                                    <Label>Email Address</Label>
                                    <p className="font-medium break-all">{selectedUser.email}</p>
                                  </div>
                                  <div>
                                    <Label>Phone Number</Label>
                                    <p className="font-medium">{selectedUser.phone || 'Not provided'}</p>
                                  </div>
                                  <div>
                                    <Label>GST Number</Label>
                                    <p className="font-medium font-mono">{selectedUser.gstNumber || 'Not provided'}</p>
                                  </div>
                                  <div>
                                    <Label>Total Orders</Label>
                                    <p className="font-medium">{selectedUser.totalOrders}</p>
                                  </div>
                                  <div>
                                    <Label>Total Spent</Label>
                                    <p className="font-medium">₹{selectedUser.totalSpent.toLocaleString()}</p>
                                  </div>
                                </div>
                                {selectedUser.address && (
                                  <div>
                                    <Label>Address</Label>
                                    <p className="font-medium">{selectedUser.address}</p>
                                  </div>
                                )}
                                <div>
                                  <Label>Account Created</Label>
                                  <p className="font-medium">
                                    {selectedUser.createdAt ? 
                                      new Date(selectedUser.createdAt.seconds ? selectedUser.createdAt.seconds * 1000 : selectedUser.createdAt).toLocaleString() 
                                      : 'N/A'
                                    }
                                  </p>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="orders">
                                {selectedUser.recentOrders.length > 0 ? (
                                  <div className="space-y-4">
                                    <div className="border rounded-lg overflow-hidden">
                                      <div className="overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="min-w-[100px]">Order ID</TableHead>
                                              <TableHead className="min-w-[120px]">Product</TableHead>
                                              <TableHead className="min-w-[100px]">Amount</TableHead>
                                              <TableHead className="min-w-[100px]">Status</TableHead>
                                              <TableHead className="min-w-[100px]">Payment</TableHead>
                                              <TableHead className="min-w-[100px]">Date</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {selectedUser.recentOrders.map((order) => (
                                              <TableRow key={order.id}>
                                                <TableCell className="font-mono text-sm">
                                                  {order.trackingId || order.id?.substring(0, 8) + '...'}
                                                </TableCell>
                                                <TableCell>
                                                  <div>
                                                    <p className="font-medium">{order.productType}</p>
                                                    <p className="text-sm text-gray-500">Qty: {order.quantity}</p>
                                                  </div>
                                                </TableCell>
                                                <TableCell className="font-semibold">
                                                  ₹{order.totalAmount?.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                  {getStatusBadge(order.status || 'pending')}
                                                </TableCell>
                                                <TableCell>
                                                  <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                                                    {order.paymentStatus || 'pending'}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                  {order.timestamp ? 
                                                    new Date(order.timestamp.seconds ? order.timestamp.seconds * 1000 : order.timestamp).toLocaleDateString() 
                                                    : 'N/A'
                                                  }
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                    {selectedUser.totalOrders > 5 && (
                                      <p className="text-sm text-gray-500 text-center">
                                        Showing recent 5 orders out of {selectedUser.totalOrders} total orders
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-gray-500">
                                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>No orders found for this user</p>
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users found matching your criteria.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserManagement;
