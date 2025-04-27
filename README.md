# 🌟 Brevity – One-Click AI-Powered Blogging with Google Authentication 🚀  

Brevity is your one-stop solution for effortless content creation. Generate and publish blog posts in a single click using AI, now with secure Google OAuth authentication to directly publish to your Blogger blogs.

## ✨ Features  
✅ AI-powered blog generation using Google's Gemini API
✅ One-click publishing to Blogger
✅ Secure Google OAuth authentication
✅ Markdown-supported content formatting
✅ Modern UI with dark/light mode
✅ User-friendly administration dashboard
✅ Secure token handling with encryption

## 🚀 How It Works  
1️⃣ **Login** with your Google account
2️⃣ **Enter** your Gemini API key
3️⃣ **Provide** your Blogger Blog ID
4️⃣ **Enter** your blog topic
5️⃣ **Click Generate** and let AI do the magic
6️⃣ **View** your published article instantly

## 📋 Prerequisites
- Node.js 18+ and npm
- Google Cloud Platform account
- Gemini API key (get one at https://ai.google.dev/)
- Google OAuth Client ID and Secret
- Blogger API enabled in your Google Cloud project

## 🔧 Setup

### 1. Clone and Install Dependencies
```bash
git clone https://github.com/yourusername/brevity.git
cd brevity
npm install
```

### 2. Set Up Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Library"
4. Enable these APIs:
   - Blogger API v3
   - Google OAuth2 API

### 3. Configure OAuth Credentials
1. In Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Set Application Type to "Web application"
4. Add authorized redirect URIs:
   - For local development: `http://localhost:3000/api/auth/callback`
   - For production: `https://yourdomain.com/api/auth/callback`
5. Copy your Client ID and Client Secret

### 4. Configure Environment Variables
1. Create a `.env.local` file in the project root (copy from `.env.local.template`)
2. Add your Google OAuth credentials:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
   ENCRYPTION_KEY=generate_a_random_32_byte_key
   ```
   To generate a random encryption key, run in Node.js:
   ```javascript
   require('crypto').randomBytes(32).toString('hex')
   ```

### 5. Run the Development Server
```bash
npm run dev
```

### 6. Visit Admin Dashboard
After logging in, go to `/admin` for detailed setup information and troubleshooting steps.

## 🌐 Production Deployment
When deploying to production:
1. Update `GOOGLE_REDIRECT_URI` to your production domain
2. Set `NODE_ENV=production`
3. Ensure all environment variables are set in your production environment
4. Add your production domain to the authorized redirect URIs in Google Cloud Console

## 🔒 Security Considerations
- Always store tokens securely
- The app uses encrypted cookies for session management
- Never commit your `.env.local` file or any credentials to version control
- In production, consider using a database for token storage instead of cookies

## 📄 License
MIT
