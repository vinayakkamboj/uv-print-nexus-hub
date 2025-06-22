
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Trash2, UserCheck } from "lucide-react";
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AdminUser {
  email: string;
  name: string;
  addedBy: string;
  addedAt: any;
  role: 'super_admin' | 'admin';
}

const AdminUserManager = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const superAdmins = [
    "help@microuvprinters.com",
    "laxmankamboj@gmail.com", 
    "vinayakkamboj01@gmail.com"
  ];

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      // Initialize with super admins
      const initialAdmins: AdminUser[] = superAdmins.map(email => ({
        email,
        name: email.split('@')[0],
        addedBy: 'system',
        addedAt: new Date(),
        role: 'super_admin' as const
      }));

      // Fetch additional admins from Firestore
      const adminDoc = await getDoc(doc(db, 'settings', 'adminUsers'));
      if (adminDoc.exists()) {
        const additionalAdmins = adminDoc.data().users || [];
        setAdminUsers([...initialAdmins, ...additionalAdmins]);
      } else {
        setAdminUsers(initialAdmins);
      }
    } catch (error) {
      console.error("Error fetching admin users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch admin users",
        variant: "destructive"
      });
    }
  };

  const addAdminUser = async () => {
    if (!newAdminEmail || !newAdminName) {
      toast({
        title: "Validation Error",
        description: "Please enter both email and name",
        variant: "destructive"
      });
      return;
    }

    if (adminUsers.some(user => user.email === newAdminEmail)) {
      toast({
        title: "User Already Exists",
        description: "This email is already an admin user",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const newAdmin: AdminUser = {
        email: newAdminEmail,
        name: newAdminName,
        addedBy: 'current_admin', // This would be the current user's email
        addedAt: new Date(),
        role: 'admin'
      };

      const currentAdmins = adminUsers.filter(user => user.role === 'admin');
      const updatedAdmins = [...currentAdmins, newAdmin];

      await setDoc(doc(db, 'settings', 'adminUsers'), {
        users: updatedAdmins
      });

      setAdminUsers(prev => [...prev, newAdmin]);
      setNewAdminEmail("");
      setNewAdminName("");

      toast({
        title: "Success",
        description: "Admin user added successfully"
      });
    } catch (error) {
      console.error("Error adding admin user:", error);
      toast({
        title: "Error",
        description: "Failed to add admin user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeAdminUser = async (email: string) => {
    if (superAdmins.includes(email)) {
      toast({
        title: "Cannot Remove",
        description: "Super admin users cannot be removed",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedAdmins = adminUsers.filter(user => 
        user.email !== email && user.role === 'admin'
      );

      await setDoc(doc(db, 'settings', 'adminUsers'), {
        users: updatedAdmins
      });

      setAdminUsers(prev => prev.filter(user => user.email !== email));

      toast({
        title: "Success",
        description: "Admin user removed successfully"
      });
    } catch (error) {
      console.error("Error removing admin user:", error);
      toast({
        title: "Error",
        description: "Failed to remove admin user",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin User Management
        </CardTitle>
        <CardDescription>
          Manage administrator access to the admin portal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Add New Admin */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Administrator
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="newAdminEmail">Email Address</Label>
                <Input
                  id="newAdminEmail"
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <Label htmlFor="newAdminName">Full Name</Label>
                <Input
                  id="newAdminName"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="Administrator Name"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addAdminUser} disabled={loading} className="w-full">
                  {loading ? "Adding..." : "Add Admin"}
                </Button>
              </div>
            </div>
          </div>

          {/* Current Admins */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Current Administrators ({adminUsers.length})
            </h3>
            <div className="space-y-3">
              {adminUsers.map((admin) => (
                <div
                  key={admin.email}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        admin.role === 'super_admin' ? 'bg-red-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <p className="font-medium">{admin.name}</p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-xs font-medium ${
                        admin.role === 'super_admin' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Added: {admin.addedAt instanceof Date ? 
                          admin.addedAt.toLocaleDateString() : 
                          'System'
                        }
                      </p>
                    </div>
                    
                    {admin.role !== 'super_admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAdminUser(admin.email)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Super Admin users (help@microuvprinters.com, laxmankamboj@gmail.com, vinayakkamboj01@gmail.com) 
              have permanent access and cannot be removed. They can manage all admin functions.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminUserManager;
