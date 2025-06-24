
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
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SimpleOrderData } from "@/lib/invoice-service";

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
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [userOrders, setUserOrders] = useState<SimpleOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      console.log("🔄 Fetching users from database...");
      
      // First, fetch all orders to get unique users
      const ordersSnapshot = await getDocs(collection(db, "orders"));
      const orders: SimpleOrderData[] = ordersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as SimpleOrderData[];

      console.log("📊 Found orders:", orders.length);

      // Group orders by user to create user profiles
      const userMap = new Map<string, UserData>();
      
      orders.forEach(order => {
        const userId = order.userId;
        const userEmail = order.customerEmail;
        const userName = order.customerName;
        
        if (userId && userEmail && userName) {
          if (!userMap.has(userId)) {
            userMap.set(userId, {
              uid: userId,
              name: userName,
              email: userEmail,
              phone: order.customerPhone || '',
              totalOrders: 0,
              totalSpent: 0,
              createdAt: order.timestamp || new Date()
            });
          }
          
          const userProfile = userMap.get(userId)!;
          userProfile.totalOrders++;
          
          if (order.paymentStatus === 'paid') {
            userProfile.totalSpent += order.totalAmount || 0;
          }
        }
      });

      const usersData = Array.from(userMap.values());
      console.log("👥 Processed users:", usersData.length);
      
      setUsers(usersData);
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOrders = async (userId: string) => {
    setOrdersLoading(true);
    try {
      console.log("🔄 Fetching orders for user:", userId);
      
      const ordersQuery = query(
        collection(db, "orders"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SimpleOrderData[];
      
      console.log("📦 Found user orders:", orders.length);
      setUserOrders(orders);
    } catch (error) {
      console.error("❌ Error fetching user orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user orders",
        variant: "destructive"
      });
    } finally {
      setOrdersLoading(false);
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
      pending_payment: { color: "bg-orange-100 text-orange-800" },
      received: { color: "bg-blue-100 text-blue-800" },
      processing: { color: "bg-purple-100 text-purple-800" },
      printed: { color: "bg-indigo-100 text-indigo-800" },
      shipped: { color: "bg-green-100 text-green-800" },
      delivered: { color: "bg-green-600 text-white" },
      cancelled: { color: "bg-red-100 text-red-800" },
      failed: { color: "bg-red-100 text-red-800" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_payment;

    return (
      <Badge className={config.color}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const handleUser = (user: UserData) => {
    setSelectedUser(user);
    fetchUserOrders(user.uid);
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
          Manage customer accounts and view detailed user information with order history
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
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
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Name</TableHead>
                <TableHead className="min-w-[200px]">Email</TableHead>
                <TableHead className="min-w-[120px]">Phone</TableHead>
                <TableHead className="min-w-[120px]">GST Number</TableHead>
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
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-blue-600">
                          {user.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium truncate">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{user.phone}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.gstNumber ? (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-mono text-sm truncate">{user.gstNumber}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {user.totalOrders || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ₹{(user.totalSpent || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {user.createdAt ? 
                      new Date(user.createdAt.seconds ? user.createdAt.seconds * 1000 : user.createdAt).toLocaleDateString() 
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => handleUser(user)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            User Details - {selectedUser?.name}
                          </DialogTitle>
                          <DialogDescription>
                            Complete profile and order history for {selectedUser?.name}
                          </DialogDescription>
                        </DialogHeader>
                        {selectedUser && (
                          <Tabs defaultValue="profile" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="profile">Profile Information</TabsTrigger>
                              <TabsTrigger value="orders">Order History ({userOrders.length})</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="profile" className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                  <p className="font-medium">{selectedUser.totalOrders || 0}</p>
                                </div>
                                <div>
                                  <Label>Total Spent</Label>
                                  <p className="font-medium">₹{(selectedUser.totalSpent || 0).toLocaleString()}</p>
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
                              {ordersLoading ? (
                                <div className="flex justify-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                              ) : userOrders.length > 0 ? (
                                <div className="space-y-4">
                                  <div className="border rounded-lg overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="min-w-[120px]">Order ID</TableHead>
                                          <TableHead className="min-w-[150px]">Product</TableHead>
                                          <TableHead className="min-w-[100px]">Amount</TableHead>
                                          <TableHead className="min-w-[100px]">Status</TableHead>
                                          <TableHead className="min-w-[100px]">Payment</TableHead>
                                          <TableHead className="min-w-[100px]">Date</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {userOrders.map((order) => (
                                          <TableRow key={order.id}>
                                            <TableCell className="font-mono text-sm">
                                              {order.trackingId || order.id?.substring(0, 8) + '...'}
                                            </TableCell>
                                            <TableCell>
                                              <div>
                                                <p className="font-medium truncate">{order.productType}</p>
                                                <p className="text-sm text-gray-500">Qty: {order.quantity}</p>
                                              </div>
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                              ₹{order.totalAmount?.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                              {getStatusBadge(order.status || 'pending_payment')}
                                            </TableCell>
                                            <TableCell>
                                              <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                                                {order.paymentStatus || 'pending'}
                                              </Badge>
                                            </TableCell>
                                            <TableCell>
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

        {filteredUsers.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No users found matching your criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserManagement;
