'use client';

import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, User, Copy, Info, BookOpen, ExternalLink, ChevronLeft, ChevronRight, Loader2, Calendar, Clock, BarChart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow, format } from 'date-fns';
import { ThemeToggle } from "@/components/theme-toggle";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BlogPost {
  _id: string;
  title: string;
  topic: string;
  url: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface UsageStats {
  daily: {
    current: number;
    limit: number;
    resetTime: string;
  };
  monthly: {
    current: number;
    limit: number;
    resetTime: string;
  };
  plan: {
    id: string;
    name: string;
  };
}

export default function AdminPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 10, pages: 0 });
  const [isLoadingBlogs, setIsLoadingBlogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loadingUsageStats, setLoadingUsageStats] = useState(false);
  const [usageStatsError, setUsageStatsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("usage");
  const [blogsTabVisited, setBlogsTabVisited] = useState(false);
  // Client-side only rendering for date-related content
  const [isClient, setIsClient] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  // Mark when client-side rendering is active
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Required environment variables
  const envVars = [
    { name: 'GOOGLE_CLIENT_ID', description: 'Google OAuth Client ID' },
    { name: 'GOOGLE_CLIENT_SECRET', description: 'Google OAuth Client Secret' },
    { name: 'GOOGLE_REDIRECT_URI', description: 'OAuth redirect URI (e.g., http://localhost:3000/api/auth/callback)' },
    { name: 'ENCRYPTION_KEY', description: '32-byte key for secure token storage' },
    { name: 'MONGODB_URI', description: 'MongoDB connection string' },
  ];

  const envVarText = envVars.map(v => `${v.name}=your_value_here`).join('\n');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(envVarText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Fetch blog posts
  const fetchBlogs = async (page = 1) => {
    try {
      setIsLoadingBlogs(true);
      setError(null);
      
      const response = await axios.get(`/api/blogs?page=${page}&limit=10`);
      setBlogs(response.data.blogs);
      setPagination(response.data.pagination);
    } catch (err: any) {
      console.error('Error fetching blogs:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load blog history');
    } finally {
      setIsLoadingBlogs(false);
    }
  };
  
  // Fetch usage statistics
  const fetchUsageStats = async () => {
    try {
      setLoadingUsageStats(true);
      setUsageStatsError(null);
      
      const response = await axios.get('/api/usage');
      setUsageStats(response.data.usage);
    } catch (err: any) {
      console.error('Error fetching usage stats:', err);
      setUsageStatsError(err.response?.data?.error || err.message || 'Failed to load usage statistics');
    } finally {
      setLoadingUsageStats(false);
    }
  };
  
  // Format date - only run on client side
  const formatDate = (dateString: string) => {
    if (!isClient) return "Loading...";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (err) {
      return 'Unknown date';
    }
  };
  
  // Format date with readable time - only run on client side
  const formatDateTime = (dateString: string) => {
    if (!isClient) return "Loading...";
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy \'at\' h:mm a');
    } catch (err) {
      return 'Unknown date';
    }
  };
  
  // Handle pagination
  const changePage = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      fetchBlogs(newPage);
    }
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Load data for the selected tab if not already loaded
    if (value === "usage" && !usageStats && !loadingUsageStats) {
      fetchUsageStats();
    }
    
    if (value === "blogs" && !blogsTabVisited) {
      fetchBlogs();
      setBlogsTabVisited(true);
    }
  };
  
  // Load usage stats on component mount (only for the default tab)
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchUsageStats(); // Only fetch usage stats initially
    }
  }, [isAuthenticated, isLoading]);

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Home
          </Button>
            <ThemeToggle />
            </div>
        </div>

        {/* User profile card */}
        {isAuthenticated && (
          <Card className="p-4 bg-white-800/80 dark:bg-white-800/10 border-black/5 dark:border-white/10 shadow-sm">
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-4">
                {user?.picture ? (
                  <AvatarImage 
                    src={user.picture} 
                    alt={user.email}
                    className="object-cover" 
                    referrerPolicy="no-referrer"  // Important for Google images
                  />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="font-medium text-sm">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Logged in successfully</p>
              </div>
              {usageStats && (
                <div className="ml-auto flex items-center">
                  <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">
                    {usageStats.plan.name} Plan
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {/* Dashboard Tabs */}
        <Tabs defaultValue="usage" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              <span>Usage Statistics</span>
            </TabsTrigger>
            <TabsTrigger value="blogs" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Blog History</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Usage Statistics Tab Content */}
          <TabsContent value="usage" className="space-y-4">
            <Card className="p-6 bg-white-800/80 dark:bg-white-800/10 border-black/5 dark:border-white/10 hover:shadow-xl dark:hover:shadow-white/20 transition-shadow duration-200 rounded-3xl">
              {loadingUsageStats ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading your usage statistics...</span>
                </div>
              ) : usageStatsError ? (
                <Alert className="m-4 bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{usageStatsError}</AlertDescription>
                </Alert>
              ) : !usageStats ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No usage statistics available.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-semibold text-lg">
                      {usageStats.plan.name} Plan
                    </h3>
                    <div className="flex items-center gap-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-primary"
                        onClick={() => fetchUsageStats()}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      
                      {usageStats.plan.name.toLowerCase() === 'free' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-primary"
                        onClick={() => router.push('/upgrade')}
                      >
                        Upgrade Plan
                      </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Daily Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <h4 className="text-sm font-medium">Daily Usage</h4>
                      <span className="text-sm text-muted-foreground">
                        {usageStats.daily.current} of {usageStats.daily.limit} posts
                      </span>
                    </div>
                    <Progress 
                      value={usageStats.daily.limit > 0 ? (usageStats.daily.current / usageStats.daily.limit) * 100 : 0} 
                      className={usageStats.daily.current >= usageStats.daily.limit ? "bg-red-200 dark:bg-red-800" : ""}
                    />
                    {isClient && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>Resets {formatDistanceToNow(new Date(usageStats.daily.resetTime), { addSuffix: true })}</span>
                        <span className="ml-1 text-xs">({formatDateTime(usageStats.daily.resetTime)})</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Monthly Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <h4 className="text-sm font-medium">Monthly Usage</h4>
                      <span className="text-sm text-muted-foreground">
                        {usageStats.monthly.current} of {usageStats.monthly.limit} posts
                      </span>
                    </div>
                    <Progress 
                      value={usageStats.monthly.limit > 0 ? (usageStats.monthly.current / usageStats.monthly.limit) * 100 : 0}
                      className={usageStats.monthly.current >= usageStats.monthly.limit ? "bg-red-200 dark:bg-red-800" : ""}
                    />
                    {isClient && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>Resets {formatDistanceToNow(new Date(usageStats.monthly.resetTime), { addSuffix: true })}</span>
                        <span className="ml-1 text-xs">({formatDateTime(usageStats.monthly.resetTime)})</span>
                      </div>
                    )}
                  </div>
                  
                  {usageStats.monthly.current >= usageStats.monthly.limit || usageStats.daily.current >= usageStats.daily.limit ? (
                    <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <AlertTitle>Usage Limit Reached</AlertTitle>
                      <AlertDescription>
                        You&apos;ve reached your {usageStats.daily.current >= usageStats.daily.limit ? 'daily' : 'monthly'} usage limit. 
                        {usageStats.plan.id === 'free' && ' Consider upgrading your plan for more posts.'}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              )}
            </Card>
          </TabsContent>
          
          {/* Blog History Tab Content */}
          <TabsContent value="blogs" className="space-y-4">
            <Card className="p-6 bg-white-800/80 dark:bg-white-800/10 border-black/5 dark:border-white/10 hover:shadow-xl dark:hover:shadow-white/20 transition-shadow duration-200 rounded-3xl">
              {isLoadingBlogs ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading your blog history...</span>
                </div>
              ) : error ? (
                <Alert className="m-4 bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : !blogsTabVisited ? (
                <div className="flex items-center justify-center p-8">
                  <span>Click on this tab to load your blog history</span>
                </div>
              ) : blogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>You haven&apos;t generated any blog posts yet. Go back to the home page to create your first blog.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-primary"
                      onClick={() => fetchBlogs(pagination.page)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                  <Table>
                    <TableCaption>A list of your generated blog posts</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden md:table-cell">Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blogs.map((blog) => (
                        <TableRow key={blog._id}>
                          <TableCell className="font-medium">{blog.title}</TableCell>
                          <TableCell className="hidden md:table-cell">{isClient ? formatDate(blog.createdAt) : "Loading..."}</TableCell>
                          <TableCell className="text-right">
                            <a
                              href={blog.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} blogs
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => changePage(pagination.page - 1)}
                          disabled={pagination.page <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="sr-only">Previous</span>
                        </Button>
                        <div className="text-sm">
                          Page {pagination.page} of {pagination.pages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => changePage(pagination.page + 1)}
                          disabled={pagination.page >= pagination.pages}
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only">Next</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}