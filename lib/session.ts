import { SessionOptions } from 'iron-session';

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
export function getSessionData(req: Request): Promise<SessionData> {
  const { cookies } = req;
  return cookies.get(sessionOptions.cookieName)?.value || { isLoggedIn: false };
}