'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { 
  Activity, Users, Command, AlertTriangle, TrendingUp, 
  RefreshCw, Download, Calendar, Shield, Zap
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    eventTypes: Record<string, number>;
    platforms: Record<string, number>;
    commands: Record<string, number>;
    errors: number;
  };
  topUsers: {
    byXP: Array<{ userId: string; xp: number; username?: string }>;
    byCommands: Array<{ userId: string; commandCount: number; username?: string }>;
    byActivity: Array<{ userId: string; activityCount: number; username?: string }>;
  };
  commandStats: {
    mostUsed: Array<{ command: string; count: number }>;
    leastUsed: Array<{ command: string; count: number }>;
    errorRates: Record<string, number>;
  };
  errorStats: {
    totalErrors: number;
    errorTypes: Record<string, number>;
    criticalErrors: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdminDashboard() {
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`, {
        headers: {
          'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalyticsData(data.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch(`/api/admin/export?timeRange=${timeRange}&format=csv&type=all`, {
        headers: {
          'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export Complete',
        description: 'Analytics data has been exported successfully'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export analytics data',
        variant: 'destructive'
      });
    }
  };

  if (!analyticsData && !loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const eventTypeData = analyticsData?.summary.eventTypes ? 
    Object.entries(analyticsData.summary.eventTypes).map(([type, count]) => ({
      name: type,
      value: count
    })) : [];

  const commandData = analyticsData?.commandStats.mostUsed?.slice(0, 10).map(cmd => ({
    command: cmd.command,
    count: cmd.count
  })) || [];

  const platformData = analyticsData?.summary.platforms ? 
    Object.entries(analyticsData.summary.platforms).map(([platform, count]) => ({
      name: platform,
      value: count
    })) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Monitor gamification metrics and system performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} disabled={loading} variant="outline" className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.summary.totalEvents?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.summary.uniqueUsers?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commands Used</CardTitle>
            <Command className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(analyticsData?.summary.commands || {}).reduce((a, b) => a + b, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total command executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analyticsData?.summary.errors || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {analyticsData?.errorStats.criticalErrors || 0} critical
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="commands">Commands</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="sync">Sync Status</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Types Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Event Types Distribution</CardTitle>
                <CardDescription>Breakdown of event types in the selected time range</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={eventTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {eventTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Platform Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Usage</CardTitle>
                <CardDescription>Activity across different platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={platformData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Users by XP */}
            <Card>
              <CardHeader>
                <CardTitle>Top Users by XP</CardTitle>
                <CardDescription>Most active users by experience points</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.topUsers.byXP?.slice(0, 5).map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="text-sm">{user.username || `User ${user.userId.slice(0, 8)}`}</span>
                      </div>
                      <span className="font-medium">{user.xp.toLocaleString()} XP</span>
                    </div>
                  )) || <p className="text-muted-foreground">No data available</p>}
                </div>
              </CardContent>
            </Card>

            {/* Top Users by Commands */}
            <Card>
              <CardHeader>
                <CardTitle>Most Active Users</CardTitle>
                <CardDescription>Users with most command usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.topUsers.byCommands?.slice(0, 5).map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="text-sm">{user.username || `User ${user.userId.slice(0, 8)}`}</span>
                      </div>
                      <span className="font-medium">{user.commandCount} commands</span>
                    </div>
                  )) || <p className="text-muted-foreground">No data available</p>}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest user interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.topUsers.byActivity?.slice(0, 5).map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="text-sm">{user.username || `User ${user.userId.slice(0, 8)}`}</span>
                      </div>
                      <span className="font-medium">{user.activityCount} events</span>
                    </div>
                  )) || <p className="text-muted-foreground">No data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commands" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Command Usage Statistics</CardTitle>
              <CardDescription>Most and least used commands</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={commandData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="command" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Statistics</CardTitle>
                <CardDescription>System errors and their frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Errors</span>
                    <Badge variant="destructive">{analyticsData?.errorStats.totalErrors || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Critical Errors</span>
                    <Badge variant="destructive">{analyticsData?.errorStats.criticalErrors || 0}</Badge>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Error Types</h4>
                    {Object.entries(analyticsData?.errorStats.errorTypes || {}).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <span>{type}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Overall system performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Error Rate</span>
                    <Badge variant={
                      (analyticsData?.summary.errors || 0) / (analyticsData?.summary.totalEvents || 1) < 0.01 
                        ? 'default' 
                        : 'destructive'
                    }>
                      {(((analyticsData?.summary.errors || 0) / (analyticsData?.summary.totalEvents || 1)) * 100).toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sync Status</span>
                    <Badge variant="default">
                      <Shield className="h-3 w-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Updated</span>
                    <span className="text-sm text-muted-foreground">
                      {lastUpdated?.toLocaleTimeString() || 'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Platform Sync Status</CardTitle>
              <CardDescription>Monitor synchronization between Discord bot and website</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analyticsData?.summary.platforms?.discord || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Discord Events</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analyticsData?.summary.platforms?.website || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Website Events</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analyticsData?.summary.eventTypes?.sync || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Sync Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
