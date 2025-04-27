"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Eye, Key, BookOpen, FileText, ExternalLink, LogIn, LogOut, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import axios from 'axios';
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

interface BlogPayload {
  gemini_api_key: string;
  blog_id: string;
  topic: string;
  access_token?: string;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [blogUrl, setBlogUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<BlogPayload>({
    gemini_api_key: typeof window !== "undefined" ? localStorage.getItem("gemini_api_key") ?? "" : "",
    blog_id: typeof window !== "undefined" ? localStorage.getItem("blog_id") ?? "" : "",
    topic: "",
  });
  
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user, login, logout } = useAuth();

  // Function to get access token
  const getAccessToken = async () => {
    try {
      const response = await axios.get('/api/auth/get-token');
      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login with Google to publish to your blog",
        variant: "destructive",
      });
      return;
    }
    
    // Validate inputs
    if (!formData.gemini_api_key || !formData.blog_id || !formData.topic) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setBlogUrl(null);

    try {
      // Get access token for n8n workflow
      const access_token = await getAccessToken();
      
      if (!access_token) {
        throw new Error("Failed to get access token. Please try logging in again.");
      }
      
      // Add access token to request payload
      const payloadWithToken = {
        ...formData,
        access_token
      };
      
      // Forward request to n8n webhook endpoint instead of local API
      const response = await axios.post(
        "https://ahmadparizaad.app.n8n.cloud/webhook-test/generate-blog", 
        payloadWithToken
      );

      if (response.status !== 200) {
        throw new Error("Failed to generate blog");
      }

      const data = response.data;
      console.log("Blog generated and published:", data.url);
      setBlogUrl(data.url);
      
      // Open blog in new tab
      if (data.url) {
        setTimeout(() => {
          window.open(data.url, "_blank");
        }, 1000);
      }
      
      toast({
        title: "Success!",
        description: "Blog generated and published successfully",
      });

      // Store API key securely
      if (typeof window !== "undefined") {
        localStorage.setItem("gemini_api_key", formData.gemini_api_key);
        localStorage.setItem("blog_id", formData.blog_id);
      }
    } catch (error: any) {
      // Handle authentication errors
      if (error.response && error.response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please login again.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to generate and publish blog. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Blog Generator</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{user?.email}</span>
                {isAuthenticated && (
                  <Link href="/admin">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex items-center gap-1"
                    >
                      <Settings className="h-4 w-4" />
                      <span className="sr-only md:not-sr-only">Admin</span>
                    </Button>
                  </Link>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={logout}
                  className="flex items-center gap-1"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={login}
                className="flex items-center gap-1"
              >
                <LogIn className="h-4 w-4" />
                Login with Google
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {!isAuthenticated && !authLoading && (
          <Card className="p-6 bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-medium">Authentication Required</h2>
              <p className="text-sm text-muted-foreground">
                You need to authenticate with Google to publish blogs. 
                This will allow the app to post to your Blogger account.
              </p>
              <Button
                onClick={login}
                className="mt-2 w-full md:w-auto"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Login with Google
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="api-key" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Gemini API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Gemini API key"
                value={formData.gemini_api_key}
                onChange={(e) =>
                  setFormData({ ...formData, gemini_api_key: e.target.value })
                }
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blog-id" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Blog ID
              </Label>
              <Input
                id="blog-id"
                placeholder="Enter blog ID"
                value={formData.blog_id}
                onChange={(e) =>
                  setFormData({ ...formData, blog_id: e.target.value })
                }
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Topic
              </Label>
              <Input
                id="topic"
                placeholder="Enter blog topic"
                value={formData.topic}
                onChange={(e) =>
                  setFormData({ ...formData, topic: e.target.value })
                }
                className="transition-all duration-200"
              />
            </div>

            <Button
              type="submit"
              className="w-full transition-all duration-200"
              disabled={isLoading || !isAuthenticated}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Generate Blog
                </>
              )}
            </Button>

            {blogUrl && (
              <a
                href={blogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 mt-4 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Published Blog
              </a>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}