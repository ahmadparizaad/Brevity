import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Add dynamic export for API routes
export const dynamic = 'force-dynamic';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: Request) {
  const scopes = [
    'https://www.googleapis.com/auth/blogger',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force to always get refresh token
    include_granted_scopes: true
  });

  return NextResponse.redirect(url);
} 