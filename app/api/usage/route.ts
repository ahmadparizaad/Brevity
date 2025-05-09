import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import BlogPost from '@/models/BlogPost';
import { getSubscriptionPlan } from '@/lib/subscription-plans';

// Define the dynamic export for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Check authentication
    const session = await getIronSession<SessionData>(request, new Response(), sessionOptions);
    if (!session.isLoggedIn || !session.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Find the user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get subscription plan details
    const subscriptionPlan = getSubscriptionPlan(user.subscription?.plan || 'free');
    
    // Calculate daily usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const postsCreatedToday = await BlogPost.countDocuments({
      user: user._id,
      createdAt: { $gte: today }
    });
    
    // Calculate daily reset time (tomorrow at midnight)
    const dailyResetTime = new Date(today);
    dailyResetTime.setDate(dailyResetTime.getDate() + 1);
    
    // Get monthly usage and reset time from user record
    const monthlyUsage = user.subscription?.currentUsage || 0;
    const monthlyResetTime = user.subscription?.nextResetDate || new Date();
    
    // Return the usage statistics
    return NextResponse.json({
      success: true,
      usage: {
        daily: {
          current: postsCreatedToday,
          limit: subscriptionPlan.limits.postsPerDay || 0,
          resetTime: dailyResetTime
        },
        monthly: {
          current: monthlyUsage,
          limit: subscriptionPlan.limits.postsPerMonth,
          resetTime: monthlyResetTime
        },
        plan: {
          id: subscriptionPlan.id,
          name: subscriptionPlan.name
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch usage statistics' 
    }, { status: 500 });
  }
}