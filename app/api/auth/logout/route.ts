import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';

// Add dynamic export for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const response = NextResponse.json({ success: true });
  
  // Get the session and destroy it
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  session.destroy();
  
  return response;
}