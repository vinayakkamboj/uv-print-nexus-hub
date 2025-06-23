
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, Mail, Calendar } from "lucide-react";

interface AdminUser {
  email: string;
  addedBy: string;
  addedAt: string;
  lastLogin?: string;
}

interface AdminUserManagerProps {
  currentAdminEmail: string;
}

const AdminUserManager = ({ currentAdminEmail }: AdminUserManagerProps) => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Default authorized admins
  const defaultAdmins = [
    "help@microuvprinters.com",
    "laxmankamboj@gmail.com", 
    "vinayakkamboj01@gmail.com"
  ];

  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = () => {
    const storedAdmins = localStorage.getItem('admin_users');
    let admins: AdminUser[] = [];

    if (storedAdmins) {
      admins = JSON.parse(storedAdmins);
    } else {
      // Initialize with default admins
      admins = defaultAdmins.map(email => ({
        email,
        addedBy: 'System',
        addedAt: new Date().toISOString(),
      }));
      localStorage.setItem('admin_users', JSON.stringify(admins));
    }

    setAdminUsers(admins);
  };

  const addAdminUser = () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    if (adminUsers.some(admin => admin.email.toLowerCase() === newAdminEmail.toLowerCase())) {
      toast({
        title: "Error",
        description: "This email is already an admin user.",
        variant: "destructive"
      });
      return;
    }

    const newAdmin: AdminUser = {
      email: newAdminEmail.trim(),
      addedBy: currentAdminEmail,
      addedAt: new Date().toISOString(),
    };

    const updatedAdmins = [...adminUsers, newAdmin];
    setAdminUsers(updatedAdmins);
    localStorage.setItem('admin_users', JSON.stringify(updatedAdmins));

    toast({
      title: "Success",
      description: `${newAdminEmail} has been added as an admin user.`,
    });

    setNewAdminEmail('');
    setDialogOpen(false);
  };

  const removeAdminUser = (email: string) => {
    if (defaultAdmins.includes(email)) {
      toast({
        title: "Cannot Remove",
        description: "Default admin users cannot be removed.",
        variant: "destructive"
      });
      return;
    }

    if (email === currentAdminEmail) {
      toast({
        title: "Cannot Remove",
        description: "You cannot remove yourself from admin users.",
        variant: "destructive"
      });
      return;
    }

    const updatedAdmins = adminUsers.filter(admin => admin.email !== email);
    setAdminUsers(updatedAdmins);
    localStorage.setItem('admin_users', JSON.stringify(updatedAdmins));

    toast({
      title: "Success",
      description: `${email} has been removed from admin users.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin User Management
        </CardTitle>
        <CardDescription>
          Manage who has access to the admin portal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium">Current Admin Users</h3>
            <p className="text-sm text-gray-500">{adminUsers.length} total admin users</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Admin User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Admin User</DialogTitle>
                <DialogDescription>
                  Enter the email address of the user you want to grant admin access to.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newAdminEmail">Email Address</Label>
                  <Input
                    id="newAdminEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={addAdminUser} className="flex-1">
                    Add Admin User
                  </Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email Address</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead>Added Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((admin) => (
                <TableRow key={admin.email}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{admin.email}</span>
                      {admin.email === currentAdminEmail && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{admin.addedBy}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(admin.addedAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={defaultAdmins.includes(admin.email) ? "default" : "secondary"}
                    >
                      {defaultAdmins.includes(admin.email) ? "Default Admin" : "Added Admin"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!defaultAdmins.includes(admin.email) && admin.email !== currentAdminEmail && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAdminUser(admin.email)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminUserManager;
