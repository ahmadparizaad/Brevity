import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';

// Add dynamic export for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get the session using iron-session
    const response = new Response();
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    if (!session.isLoggedIn || !session.access_token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Check if token is expired and refresh if needed
    if (session.expiry_date && new Date().getTime() > session.expiry_date) {
      // We need to refresh the token
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      oauth2Client.setCredentials({
        refresh_token: session.refresh_token
      });
      
      const { token, res } = await oauth2Client.getAccessToken();
      const expiry_date = res?.data.expiry_date;
      
      // Update the session with new token
      session.access_token = token || '';
      session.expiry_date = expiry_date as number;
      await session.save();
      
      const jsonResponse = NextResponse.json({ access_token: token });
      // Copy the Set-Cookie header from our response to the JSON response
      const setCookieHeader = response.headers.get('Set-Cookie');
      if (setCookieHeader) {
        jsonResponse.headers.set('Set-Cookie', setCookieHeader);
      }
      
      return jsonResponse;
    }
    
    // Return existing token if not expired
    return NextResponse.json({ access_token: session.access_token });
  } catch (error) {
    console.error('Error getting access token:', error);
    return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
  }
}