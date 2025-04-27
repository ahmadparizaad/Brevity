'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AuthErrorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">Authentication Error</h1>
          <p className="text-muted-foreground">
            There was a problem authenticating with Google. Please try again.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            onClick={() => router.push('/api/auth/google')}
            className="w-full"
          >
            Try Again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
            className="w-full"
          >
            Return to Home
          </Button>
        </div>
      </Card>
    </div>
  );
} 