'use client';

import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, KeyRound, Copy, Info, BookOpen, ExternalLink, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
import { formatDistanceToNow } from 'date-fns';
import { ThemeToggle } from "@/components/theme-toggle";

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

export default function AdminPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 10, pages: 0 });
  const [isLoadingBlogs, setIsLoadingBlogs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

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
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
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
  
  // Load blogs on component mount
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchBlogs();
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

        
        {isAuthenticated && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-800">
            <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle>Logged in as:</AlertTitle>
            <AlertDescription>{user?.email}</AlertDescription>
          </Alert>
        )}
        
        {/* Blog History Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Blog Post History
          </h2>
          
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
            ) : blogs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>You haven&apos;t generated any blog posts yet. Go back to the home page to create your first blog.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableCaption>A list of your generated blog posts</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      {/* <TableHead>Topic</TableHead> */}
                      <TableHead className="hidden md:table-cell">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blogs.map((blog) => (
                      <TableRow key={blog._id}>
                        <TableCell className="font-medium">{blog.title}</TableCell>
                        {/* <TableCell>{blog.topic}</TableCell> */}
                        <TableCell className="hidden md:table-cell">{formatDate(blog.createdAt)}</TableCell>
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
        </div>

        {/* Environment Setup Section */}
        {/* <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Environment Setup</h2>
          
          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-2">
              <KeyRound className="h-5 w-5 mt-0.5 text-amber-500" />
              <div>
                <h3 className="font-medium">Required Environment Variables</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a <code className="bg-muted px-1 py-0.5 rounded text-xs">.env.local</code> file 
                  in the root of your project with these variables:
                </p>
              </div>
            </div>
            
            <div className="relative">
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                {envVarText}
              </pre>
              <Button 
                size="sm" 
                variant="outline" 
                className="absolute top-2 right-2"
                onClick={copyToClipboard}
              >
                <Copy className="h-4 w-4 mr-1" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Secure Your Credentials</AlertTitle>
              <AlertDescription className="text-sm">
                Never commit your .env.local file to version control. Ensure it&apos;s included in your .gitignore file.
              </AlertDescription>
            </Alert>
          </Card>
        </div> */}
      </div>
    </div>
  );
}