import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  TrendingUp,
  HardDrive,
  Share2,
  DollarSign,
  Download,
  RefreshCw,
  FileText,
  Activity,
} from 'lucide-react';
import { analyticsService, AnalyticsData } from '@/services/analytics';
import { toast } from '@/hooks/use-toast';
import { MeshGradient } from '@/components/animations/MeshGradient';
import { FloatingElements } from '@/components/animations/FloatingElements';

// Chart colors
const COLORS = ['#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#14B8A6'];

const Analytics = () => {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [account?.address]);

  const loadAnalytics = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const data = await analyticsService.getAnalytics(account?.address, forceRefresh);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAnalytics(true);
    toast({ title: 'Analytics Refreshed' });
  };

  const handleExport = () => {
    if (analytics) {
      analyticsService.exportAnalytics(analytics);
      toast({ title: 'Analytics Exported', description: 'Downloaded as JSON' });
    }
  };

  // Prepare chart data
  const activityChartData = analytics?.activity.uploads.map((upload, index) => ({
    date: upload.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    uploads: upload.count,
    downloads: analytics.activity.downloads[index]?.count || 0,
    shares: analytics.activity.shares[index]?.count || 0,
  })) || [];

  const storageByCategory = analytics
    ? analyticsService.groupStorageByCategory(analytics.storage.byType)
    : {};

  const pieChartData = Object.entries(storageByCategory).map(([category, bytes]) => ({
    name: category,
    value: bytes,
    displayValue: analyticsService.formatBytes(bytes),
  }));

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <MeshGradient colors={['#0EA5E9', '#8B5CF6', '#EC4899']} speed={0.2} />
      <FloatingElements count={10} />

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="hover:bg-primary/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Insights into your storage usage and activity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!analytics}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <ThemeToggle />
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        {!account ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>
                Connect your wallet to view analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <WalletConnectButton />
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : analytics ? (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="sharing">Sharing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analyticsService.formatBytes(analytics.storage.totalBytes)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analytics.storage.fileCount} files
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analyticsService.formatSUI(analytics.costs.totalSpent)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analytics.costs.storageEpochs} storage epochs
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Share Links</CardTitle>
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.sharing.totalLinks}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analytics.sharing.activeLinks} active
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Monthly Projection</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analyticsService.formatSUI(analytics.costs.projectedMonthly)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Estimated monthly cost
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Storage Distribution */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Storage Distribution by File Type</CardTitle>
                    <CardDescription>
                      Breakdown of storage usage across different file categories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pieChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any, name: any, props: any) =>
                              props.payload.displayValue
                            }
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No storage data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Cost Breakdown */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Breakdown</CardTitle>
                    <CardDescription>
                      Detailed breakdown of storage and transaction costs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Storage Cost</span>
                        <span className="font-medium">
                          {analyticsService.formatSUI(
                            analytics.costs.totalSpent - analytics.costs.transactionFees
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Transaction Fees</span>
                        <span className="font-medium">
                          {analyticsService.formatSUI(analytics.costs.transactionFees)}
                        </span>
                      </div>
                      <div className="border-t pt-4 flex justify-between items-center">
                        <span className="font-medium">Total Spent</span>
                        <span className="text-xl font-bold">
                          {analyticsService.formatSUI(analytics.costs.totalSpent)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              {/* Activity Timeline */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Timeline (Last 30 Days)</CardTitle>
                    <CardDescription>
                      Track your uploads, downloads, and shares over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activityChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={activityChartData}>
                          <defs>
                            <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#EC4899" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="uploads"
                            stroke="#0EA5E9"
                            fillOpacity={1}
                            fill="url(#colorUploads)"
                          />
                          <Area
                            type="monotone"
                            dataKey="downloads"
                            stroke="#8B5CF6"
                            fillOpacity={1}
                            fill="url(#colorDownloads)"
                          />
                          <Area
                            type="monotone"
                            dataKey="shares"
                            stroke="#EC4899"
                            fillOpacity={1}
                            fill="url(#colorShares)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-96 flex items-center justify-center text-muted-foreground">
                        No activity data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="sharing" className="space-y-6">
              {/* Sharing Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics.sharing.totalLinks}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {analytics.sharing.activeLinks}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Accesses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics.sharing.totalAccesses}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Most Shared Files */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Shared Files</CardTitle>
                  <CardDescription>
                    Files with the highest number of share link accesses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.sharing.topFiles.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.sharing.topFiles.map((file, index) => (
                        <div
                          key={file.fileId}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <div>
                              <p className="font-medium">{file.fileName}</p>
                              <p className="text-xs text-muted-foreground">{file.fileId}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{file.accessCount}</p>
                            <p className="text-xs text-muted-foreground">accesses</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-muted-foreground">
                      No sharing data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Share Activity Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Share Activity (Last 30 Days)</CardTitle>
                  <CardDescription>
                    Track when share links were created
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activityChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={activityChartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="shares" fill="#EC4899" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No share activity data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </main>
    </div>
  );
};

export default Analytics;
