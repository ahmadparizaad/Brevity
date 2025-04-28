import { SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

// This is where we define our session options
export const sessionOptions: SessionOptions = {
  password: process.env.ENCRYPTION_KEY || 'complex_password_at_least_32_characters_long',
  cookieName: 'brevity_auth_session',
  cookieOptions: {
    // secure: true should be used in production (HTTPS) but can be set to false in development (HTTP)
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true, // This prevents client-side JavaScript from reading the cookie
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    path: '/', // The cookie will be available throughout the site
  },
};

// Type for our session data
export interface SessionData {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  user?: {
    email: string;
    name: string;
    picture?: string;
  };
  isLoggedIn: boolean;
}

// Helper to get typed session data
export async function getSessionData(req: Request): Promise<SessionData> {
  // Use Next.js cookies API instead of direct req.cookies
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(sessionOptions.cookieName)?.value;
  return sessionCookie ? (JSON.parse(sessionCookie) as SessionData) : { isLoggedIn: false };
}