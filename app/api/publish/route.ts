import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { marked } from 'marked';
import { google } from 'googleapis';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';

// Add dynamic export for API routes
export const dynamic = 'force-dynamic';

const systemPrompt = `
You are a professional blog writer specializing in AI, emerging technologies, and innovations. Your readers are tech enthusiasts, developers, and industry professionals who love exploring new advancements.  
Your goal is to create **engaging, well-structured, and informative** articles that:  
✅ Explain AI concepts clearly (without too much jargon).  
✅ Provide **insights on new technologies** with practical applications.  
✅ Keep readers updated on the latest AI trends and breakthroughs.  

### **Blog Structure:**  

1️⃣ **Title:**  
- Write a **compelling, SEO-friendly** headline that is clear and attention-grabbing.  
- Example: *"How AI is Redefining Creativity: The Rise of Generative Models"*  

2️⃣ **Introduction:**  
- Start with a **hook** (thought-provoking question, surprising fact, or real-world example).  
- Explain **why the topic is important** and how it impacts AI & innovation.  
- End with a brief overview of what the article will cover.  

3️⃣ **Main Content:**  
- Use **headings (H2, H3)** to break down the article into sections.  
- Keep paragraphs **short and concise** (2-4 sentences per paragraph).  
- Use **bullet points, numbered lists, or step-by-step explanations** to enhance clarity.  
- Include **real-world applications, case studies, expert opinions, and statistics**.  
- Compare **pros & cons** or **different AI approaches** when relevant.  

4️⃣ **Conclusion:**  
- Summarize key takeaways and the future potential of the topic.  
- Provide **actionable insights** (e.g., how readers can stay ahead of the trend).  

5️⃣ **Call to Action (CTA):**  
- Encourage engagement: *"What are your thoughts on AI's role in creativity? Share in the comments!"*  
- Suggest further reading or resources: *"Want to explore more? Check out our latest AI trend reports!"*  

6️⃣ **SEO & Readability:**  
- Naturally include **relevant keywords** (AI, machine learning, generative models, etc.).  
- Use **simple and engaging language**—keep it **informative yet easy to digest**.  
- Add **internal links** to related blog posts and **external links** to credible sources.  

Now, generate a high-quality article on the provided topic using this structure.
`;

// Get access token from session or request
async function getUserToken(request: Request, providedToken?: string) {
  // If token is provided from the request, use it
  if (providedToken) {
    return providedToken;
  }

  // Otherwise try to get it from session
  const session = await getIronSession<SessionData>(request, new Response(), sessionOptions);
  
  if (!session.isLoggedIn || !session.access_token) {
    throw new Error('User not authenticated');
  }
  
  try {
    // Check if token is expired
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
      
      const { token } = await oauth2Client.getAccessToken();
      
      // Update the session with new token
      session.access_token = token || '';
      await session.save();
      
      return token;
    }
    
    return session.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error('Authentication error');
  }
}

  async function generatePost(topic: string, apiKey: string) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      const prompt = `${systemPrompt}\n\nTopic: ${topic}`;
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      return {
        title: text.split('\n')[0].trim().replace(/^#\s*/, '').replace(/^Title:\s*/, '').slice(2),
        content: text.split('\n').slice(1).join('\n')
      };
    } catch (error) {
      console.error('Error generating post:', error);
      throw new Error('Failed to generate blog post');
    }
  }

async function createPost(blogId: string, title: string, content: string, accessToken: string) {
  try {
    const markedContent = marked(content);
    const response = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        kind: 'blogger#post',
        title,
        content: markedContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Blogger API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to publish blog post');
    }

    const data = await response.json();
    console.log('Blog post created:', data);
    return { url: data.url };
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Raw Request Body:", body); // Debugging line

    const { topic, blog_id, gemini_api_key, access_token } = body;
    console.log("Request Body:", { topic, blog_id, gemini_api_key, access_token: access_token ? '[PRESENT]' : '[MISSING]' }); // Debugging line

    if (!topic || !blog_id || !gemini_api_key) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check if user is authenticated - either with token from the request or from session
    const accessToken = await getUserToken(request, access_token);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const generatedPost = await generatePost(topic, gemini_api_key);
    const result = await createPost(blog_id, generatedPost.title, generatedPost.content, accessToken);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in publish endpoint:', error);
    
    // Check if it's an authentication error
    if (error.message === 'User not authenticated' || error.message === 'Authentication error') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate and publish blog post' },
      { status: 500 }
    );
  }
}