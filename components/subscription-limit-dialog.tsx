'use client'

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubscriptionPlan } from "@/lib/subscription-plans";
import { AlertCircle, Check, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, addDays, addMonths, formatDistance } from "date-fns";

interface SubscriptionLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsage: number;
  currentPlan: SubscriptionPlan;
  upgradePlan?: SubscriptionPlan | null;
  limitType?: string;
  limit?: number;
  resetTime?: Date;
}

export function SubscriptionLimitDialog({
  isOpen,
  onClose,
  currentUsage,
  currentPlan,
  upgradePlan,
  limitType = 'monthly',
  limit,
  resetTime
}: SubscriptionLimitDialogProps) {
  const [showContactInfo, setShowContactInfo] = useState(false);

  const handleUpgrade = () => {
    // Show the contact information since the upgrade page is under development
    setShowContactInfo(true);
  }
  
  // Use the provided limit or fall back to the plan limits
  const actualLimit = limit || 
    (limitType === 'daily' 
      ? currentPlan.limits.postsPerDay || 0
      : currentPlan.limits.postsPerMonth);
      
  // Calculate reset time if not provided
  const now = new Date();
  // For daily limits, reset at midnight. For monthly, use the provided resetTime from the server
  const calculatedResetTime = resetTime 
    ? new Date(resetTime) 
    : (limitType === 'daily'
        ? addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1) // Next day at midnight
        : addMonths(now, 1) // Exactly one month from now as fallback
      );
  
  // Format the reset time for display
  const resetTimeStr = format(calculatedResetTime, "MMMM d, yyyy 'at' h:mm a");
  const timeUntilReset = formatDistance(calculatedResetTime, now, { addSuffix: true });
  
  // Create email information with proper formatting
  const supportEmail = "thebrevityai@gmail.com";
  const emailSubject = `Brevity AI Plan Upgrade Request - ${currentPlan.name} to ${upgradePlan?.name || 'Higher Plan'}`;
  const emailBody = 
    `Dear Brevity Team,\n\n` +
    `I'd like to upgrade my subscription plan.\n\n` +
    `Current Plan: ${currentPlan.name}\n` +
    `Current Usage: ${currentUsage} posts\n` + 
    `Limit Type: ${limitType === 'daily' ? 'Daily' : 'Monthly'}\n` +
    `Desired Plan: ${upgradePlan?.name || 'Please recommend a suitable plan'}\n\n` +
    `Please let me know the next steps to upgrade my account.\n\n` +
    `Regards,\n\n` +
    `Name:\n` +
    `Email:\n`;
  
  // Format the mailto link
  const mailtoHref = `mailto:${supportEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            You&apos;ve reached your {limitType} plan limit
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {limitType === 'daily' ? (
              <>You&apos;ve used {currentUsage} out of {actualLimit} posts allowed per day in your {currentPlan.name} plan.</>
            ) : (
              <>You&apos;ve used {currentUsage} out of {actualLimit} posts allowed per month in your {currentPlan.name} plan.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 overflow-y-auto pr-1">
          {/* Reset time information */}
          <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
            <Clock className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">Credits will be available again:</p>
              <p className="text-sm text-muted-foreground">{resetTimeStr}</p>
              <p className="text-xs mt-1">({timeUntilReset})</p>
            </div>
          </div>

          {showContactInfo ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Upgrade page under development</AlertTitle>
              <AlertDescription>
                Our subscription management page is coming soon! Please contact us at{" "}
                <a 
                  href={mailtoHref}
                  className="font-medium underline underline-offset-4 hover:text-primary"
                >
                  {supportEmail}
                </a>{" "}
                to upgrade your plan.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-2">Your Current Plan: {currentPlan.name}</h3>
                <ul className="space-y-1">
                  {currentPlan.features.map((feature, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <Check className="mr-2 h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {upgradePlan && (
                <div className="rounded-lg border border-primary bg-primary/5 p-4">
                  <h3 className="font-medium mb-2">Recommended Upgrade: {upgradePlan.name}</h3>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Price:</span>
                    <span className="font-medium">${upgradePlan.price.usd}/month (₹{upgradePlan.price.inr})</span>
                  </div>
                  <ul className="space-y-1">
                    {upgradePlan.features.map((feature, index) => (
                      <li key={index} className="text-sm flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-auto">
          <Button variant="outline" onClick={onClose} className="sm:flex-1">
            Maybe Later
          </Button>
          {showContactInfo ? (
            <Button className="sm:flex-1" asChild>
              <a href={mailtoHref}>
                Contact Support
              </a>
            </Button>
          ) : (
            <Button onClick={handleUpgrade} className="sm:flex-1">
              Upgrade Now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}