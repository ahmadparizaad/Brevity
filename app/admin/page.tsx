'use client';

import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, KeyRound, Copy, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Redirect if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push('/');
    return null;
  }

  // Required environment variables
  const envVars = [
    { name: 'GOOGLE_CLIENT_ID', description: 'Google OAuth Client ID' },
    { name: 'GOOGLE_CLIENT_SECRET', description: 'Google OAuth Client Secret' },
    { name: 'GOOGLE_REDIRECT_URI', description: 'OAuth redirect URI (e.g., http://localhost:3000/api/auth/callback)' },
    { name: 'ENCRYPTION_KEY', description: '32-byte key for secure token storage' },
  ];

  const envVarText = envVars.map(v => `${v.name}=your_value_here`).join('\n');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(envVarText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        
        {isAuthenticated && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-800">
            <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle>Logged in as:</AlertTitle>
            <AlertDescription>{user?.email}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Environment Setup</h2>
          
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
                Never commit your .env.local file to version control. Ensure it's included in your .gitignore file.
              </AlertDescription>
            </Alert>
          </Card>
          
          <h2 className="text-xl font-semibold mt-8">Google OAuth Setup</h2>
          <Card className="p-6 space-y-4">
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" className="text-primary hover:underline">Google Cloud Console</a></li>
              <li>Create a new project or select an existing one</li>
              <li>Navigate to "APIs & Services" > "Credentials"</li>
              <li>Click "Create Credentials" > "OAuth client ID"</li>
              <li>Set the application type to "Web application"</li>
              <li>Add authorized redirect URIs:
                <code className="block bg-muted p-2 rounded-md mt-2 text-xs">
                  http://localhost:3000/api/auth/callback
                </code>
                <span className="text-muted-foreground">(Add your production URL when deploying)</span>
              </li>
              <li>Click "Create" and note your Client ID and Client Secret</li>
              <li>Enable the Blogger API in "APIs & Services" > "Library"</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
} 