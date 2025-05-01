import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectToDatabase } from '@/lib/mongodb';
import BlogPost from '@/models/BlogPost';
import User from '@/models/User';

// Add dynamic export for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get the user from session
    const session = await getIronSession<SessionData>(request, new Response(), sessionOptions);
    
    if (!session.isLoggedIn || !session.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Find user ID first
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Query parameters
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || 10;
    const page = Number(url.searchParams.get('page')) || 1;
    const skip = (page - 1) * limit;

    // Find blogs for the current user only
    const blogs = await BlogPost
      .find({ user: user._id }) // Filter by user ID
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email');
    
    // Get total count for pagination (for this user only)
    const total = await BlogPost.countDocuments({ user: user._id });
    
    return NextResponse.json({
      blogs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}