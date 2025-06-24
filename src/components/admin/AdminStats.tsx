
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Users, IndianRupee, TrendingUp, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { getAdminStats, AdminStats as AdminStatsType } from "@/lib/admin-service";

const AdminStats = () => {
  const [stats, setStats] = useState<AdminStatsType>({
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log("🔄 Fetching admin stats...");
        const adminStats = await getAdminStats();
        setStats(adminStats);
        console.log("✅ Admin stats loaded:", adminStats);
      } catch (error) {
        console.error("❌ Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: Package,
      color: "bg-blue-500"
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "bg-green-500"
    },
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: IndianRupee,
      color: "bg-purple-500"
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders,
      icon: Clock,
      color: "bg-yellow-500"
    },
    {
      title: "Completed Orders",
      value: stats.completedOrders,
      icon: CheckCircle,
      color: "bg-green-600"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 lg:p-6">
              <div className="h-12 lg:h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900 truncate">{stat.value}</p>
              </div>
              <div className={`p-2 lg:p-3 rounded-full ${stat.color} text-white flex-shrink-0`}>
                <stat.icon className="h-4 w-4 lg:h-6 lg:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminStats;
