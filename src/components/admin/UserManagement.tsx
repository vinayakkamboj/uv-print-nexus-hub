
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
import { Search, Users, Eye, Mail, Phone, Building, Package, CreditCard, Calendar } from "lucide-react";
import { collection, getDocs, doc, updateDoc, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

interface OrderData {
  id: string;
  userId?: string;
  productType?: string;
  quantity?: number;
  totalAmount?: number;
  status?: string;
  paymentStatus?: string;
  executionStatus?: string;
  timestamp?: any;
  trackingId?: string;
  [key: string]: any;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userOrders, setUserOrders] = useState<OrderData[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(
        query(collection(db, "users"), orderBy("createdAt", "desc"))
      );
      
      const usersData = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserData[];

      // Fetch order stats for each user
      const ordersSnapshot = await getDocs(collection(db, "orders"));
      const orders: OrderData[] = ordersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      const usersWithStats = usersData.map(user => {
        const userOrders = orders.filter(order => order.userId === user.uid);
        const totalSpent = userOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        
        return {
          ...user,
          totalOrders: userOrders.length,
          totalSpent
        };
      });
      
      setUsers(usersWithStats);
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

  const fetchUserOrders = async (userId: string) => {
    setOrdersLoading(true);
    try {
      const ordersQuery = query(
        collection(db, "orders"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OrderData[];
      
      setUserOrders(orders);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user orders",
        variant: "destructive"
      });
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleUserClick = (user: UserData) => {
    setSelectedUser(user);
    fetchUserOrders(user.uid);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending_payment: "bg-orange-100 text-orange-800",
      received: "bg-blue-100 text-blue-800",
      processing: "bg-purple-100 text-purple-800",
      shipped: "bg-cyan-100 text-cyan-800",
      delivered: "bg-green-100 text-green-800"
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {status?.replace('_', ' ')}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800"
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
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
          Manage customer accounts and view detailed user information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>GST Number</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {user.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {user.phone}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.gstNumber ? (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="font-mono text-sm">{user.gstNumber}</span>
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
                        <Button variant="ghost" size="sm" onClick={() => handleUserClick(user)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>User Details - {selectedUser?.name}</DialogTitle>
                          <DialogDescription>
                            Complete information and order history
                          </DialogDescription>
                        </DialogHeader>
                        {selectedUser && (
                          <Tabs defaultValue="details" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="details">User Details</TabsTrigger>
                              <TabsTrigger value="orders">Order History ({userOrders.length})</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="details" className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Full Name</Label>
                                  <p className="font-medium">{selectedUser.name}</p>
                                </div>
                                <div>
                                  <Label>Email Address</Label>
                                  <p className="font-medium">{selectedUser.email}</p>
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
                                <div className="text-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary border-solid mx-auto mb-2"></div>
                                  <p className="text-gray-600">Loading orders...</p>
                                </div>
                              ) : userOrders.length > 0 ? (
                                <div className="space-y-4">
                                  {userOrders.map((order) => (
                                    <div key={order.id} className="border rounded-lg p-4">
                                      <div className="flex items-start justify-between mb-3">
                                        <div>
                                          <h4 className="font-semibold">{order.productType}</h4>
                                          <p className="text-sm text-gray-500 font-mono">ID: {order.trackingId}</p>
                                          <p className="text-sm text-gray-500">Qty: {order.quantity}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-bold text-lg">₹{order.totalAmount?.toLocaleString()}</p>
                                          <p className="text-sm text-gray-500">
                                            {order.timestamp ? 
                                              new Date(order.timestamp.seconds ? order.timestamp.seconds * 1000 : order.timestamp).toLocaleDateString() 
                                              : 'N/A'
                                            }
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {getStatusBadge(order.status || 'pending')}
                                        {getPaymentStatusBadge(order.paymentStatus || 'pending')}
                                        {order.executionStatus && (
                                          <Badge className="bg-indigo-100 text-indigo-800">
                                            {order.executionStatus.replace('_', ' ')}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
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
