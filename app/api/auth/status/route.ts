import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';

// Add dynamic export for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getIronSession<SessionData>(request, new Response(), sessionOptions);
  
  if (session.isLoggedIn && session.user) {
    return NextResponse.json({
      authenticated: true,
      user: session.user
    });
  }
  
  return NextResponse.json({
    authenticated: false
  });
}