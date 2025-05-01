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
      console.log('Token expired, attempting to refresh...');
      // We need to refresh the token
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        
        if (!session.refresh_token) {
          console.error('No refresh token available');
          return NextResponse.json({ error: 'No refresh token available' }, { status: 401 });
        }
        
        oauth2Client.setCredentials({
          refresh_token: session.refresh_token
        });
        
        // Log client ID for debugging
        console.log('Using client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 8) + '...');
        
        try {
          const { token, res } = await oauth2Client.getAccessToken();
          console.log('Token refreshed successfully');
          
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
        } catch (refreshError: any) {
          console.error('Error refreshing token:', refreshError?.message || refreshError);
          
          if (refreshError?.message?.includes('disabled_client') || 
              refreshError?.response?.status === 401) {
            
            // Clear invalid session data and force re-authentication
            session.isLoggedIn = false;
            session.access_token = '';
            session.refresh_token = '';
            await session.save();
            
            return NextResponse.json({ 
              error: 'Authentication expired, please login again',
              needsReauthentication: true 
            }, { status: 401 });
          }
          
          return NextResponse.json({ 
            error: 'Failed to refresh authentication' 
          }, { status: 401 });
        }
      } catch (setupError) {
        console.error('Error setting up OAuth client:', setupError);
        return NextResponse.json({ error: 'Authentication configuration error' }, { status: 500 });
      }
    }
    
    // Return existing token if not expired
    return NextResponse.json({ access_token: session.access_token });
  } catch (error) {
    console.error('Error getting access token:', error);
    return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
  }
}