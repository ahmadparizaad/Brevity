import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import BlogPost from '@/models/BlogPost';

interface UserUpdates {
  blog_id?: string;
  gemini_api_key?: string;
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  console.log('[BlogPost] POST request received');
  
  try {
    // Debug session retrieval
    console.log('[BlogPost] Retrieving session...');
    const session = await getIronSession<SessionData>(request, new Response(), sessionOptions);
    
    if (!session.isLoggedIn || !session.user?.email) {
      console.warn('[BlogPost] Unauthorized access attempt');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse request body with type safety
    const body = await request.json() as {
      topic: string;
      blog_id?: string;
      gemini_api_key?: string;
    };

    // Forward to n8n webhook
    const response = await fetch('https://delicate-monitor-frequently.ngrok-free.app/webhook/generate-blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.error || 'Failed to process with n8n' },
        { status: response.status }
      );
    }

    const data = await response.json() as Array<{
      url: string;
      title?: string;
      content?: string;
    }>;
    
    // Save to MongoDB if successful
    if (data?.[0]?.url) {
      try {
        await connectToDatabase();
        const user = await User.findOne({ email: session.user.email });
        
        if (user) {
          const updates: UserUpdates = {};
          
          if (body.blog_id && !user.blog_id) {
            updates.blog_id = body.blog_id;
          }
          
          if (body.gemini_api_key && !user.gemini_api_key) {
            updates.gemini_api_key = body.gemini_api_key;
          }
          
          if (Object.keys(updates).length > 0) {
            await User.updateOne({ _id: user._id }, { $set: updates });
          }
          
          await BlogPost.create({
            title: data[0].title || body.topic,
            topic: body.topic,
            url: data[0].url,
            user: user._id,
            content: data[0].content || null,
          });
        }
      } catch (error: unknown) {
        console.error('Database error:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}