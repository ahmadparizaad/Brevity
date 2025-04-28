import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

// Add dynamic export for API routes
export const dynamic = 'force-dynamic';

// OAuth client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/auth-error', url.origin));
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Set the credentials
    oauth2Client.setCredentials(tokens);
    
    // Get user info
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    
    const userInfo = await oauth2.userinfo.get();
    
    // Create a response object that we'll use to set the session cookie
    const response = NextResponse.redirect(new URL('/', url.origin));
    
    // Create the session with iron-session
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    // Update session data
    session.access_token = tokens.access_token || '';
    session.refresh_token = tokens.refresh_token || '';
    session.expiry_date = tokens.expiry_date as number;
    session.user = {
      email: userInfo.data.email || '',
      name: userInfo.data.name || '',
      picture: userInfo.data.picture || ''
    };
    session.isLoggedIn = true;
    
    // Save the session
    await session.save();
    
    // Connect to MongoDB and save or update user
    try {
      await connectToDatabase();
      
      // Find user by email or create a new one
      await User.findOneAndUpdate(
        { email: userInfo.data.email },
        {
          name: userInfo.data.name,
          picture: userInfo.data.picture,
        },
        { upsert: true, new: true }
      );
      
      console.log('User saved/updated in MongoDB:', userInfo.data.email);
    } catch (dbError) {
      console.error('Error saving user to MongoDB:', dbError);
      // Continue with auth flow even if DB save fails
    }
    
    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    // Add more detailed logging
    if (error instanceof Error && (error as any).response) {
      const response = (error as any).response;
      console.error('Error response data:', response.data);
      console.error('Error response status:', response.status);
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(new URL('/auth-error?reason=' + encodeURIComponent(errorMessage), url.origin));
  }
}