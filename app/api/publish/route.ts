import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import BlogPost from '@/models/BlogPost';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { getCategoryPrompt } from '@/lib/category-prompts';
import { getSubscriptionPlan, SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';

// Create a new rateLimit instance for anonymous users (fallback)
const rateLimit = new Ratelimit({
  redis: kv, // Use Vercel KV for storage
  limiter: Ratelimit.slidingWindow(2, '5m'), // Limit to 2 request per 5 minutes for anonymous users
  analytics: true, // Enable analytics
});

// Define the dynamic export for API routes
export const dynamic = 'force-dynamic';

// Define the input types
interface PublishRequest {
  blog_id: string;
  topic: string;
  category: string;
  custom_instructions?: string;
  access_token: string;
}

interface UserUpdates {
  blog_id?: string;
}

export async function POST(request: Request) {
  try {
    console.log('Starting publish endpoint processing');
    
    // Get Gemini API key from environment variables
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY environment variable not set');
      return NextResponse.json({
        success: false,
        message: 'Server configuration error: Gemini API key not available'
      }, { status: 500 });
    }

    // Connect to MongoDB first
    try {
      await connectToDatabase();
      console.log('Database connected successfully');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database connection failed'
      }, { status: 500 });
    }
    
    // Get the session for user authentication
    let userId = null;
    let userEmail = null;
    let user = null;
    let subscriptionPlan = null;
    
    try {
      const session = await getIronSession<SessionData>(request, new Response(), sessionOptions);
      if (session.isLoggedIn && session.user?.email) {
        userEmail = session.user.email;
        user = await User.findOne({ email: session.user.email });
        
        if (user) {
          userId = user._id;
          console.log('Found user:', userId);
          
          // Get subscription plan details
          subscriptionPlan = getSubscriptionPlan(user.subscription?.plan || 'free');
          console.log(`User subscription plan: ${subscriptionPlan.name}, Usage: ${user.subscription?.currentUsage || 0}/${subscriptionPlan.limits.postsPerMonth}`);
          
          // Check if we've passed the monthly reset date
          const now = new Date();
          const nextResetDate = user.subscription?.nextResetDate;
          
          if (nextResetDate && now >= nextResetDate) {
            // Time to reset the monthly counter
            console.log(`Monthly reset date reached (${nextResetDate}). Resetting usage count for user ${userId}`);
            
            // Calculate the next reset date (1 month from current reset date)
            const newResetDate = new Date(nextResetDate);
            newResetDate.setMonth(newResetDate.getMonth() + 1);
            
            // Update the user with reset count and new reset date
            await User.updateOne(
              { _id: userId },
              { 
                'subscription.currentUsage': 0,
                'subscription.nextResetDate': newResetDate
              }
            );
            
            // Reload the user to get updated values
            user = await User.findOne({ _id: userId });
            console.log(`User subscription reset. Next reset date: ${user.subscription?.nextResetDate}`);
          }
          
          // Check if user has reached their monthly subscription limit
          if (user.subscription?.currentUsage >= subscriptionPlan.limits.postsPerMonth) {
            // Calculate time until reset
            const resetTime = user.subscription?.nextResetDate || new Date();
            
            return NextResponse.json({
              success: false,
              subscriptionLimitReached: true,
              currentUsage: user.subscription.currentUsage,
              limit: subscriptionPlan.limits.postsPerMonth,
              planName: subscriptionPlan.name,
              resetTime: resetTime.toISOString(),
              message: `You've reached your ${subscriptionPlan.name} plan limit of ${subscriptionPlan.limits.postsPerMonth} posts per month. Please upgrade your subscription.`
            }, { status: 429 });
          }

          // Check if user has reached their daily subscription limit
          if (subscriptionPlan.limits.postsPerDay) {
            // Get posts created today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const postsCreatedToday = await BlogPost.countDocuments({
              user: userId,
              createdAt: { $gte: today }
            });
            
            console.log(`Posts created today: ${postsCreatedToday}/${subscriptionPlan.limits.postsPerDay}`);
            
            if (postsCreatedToday >= subscriptionPlan.limits.postsPerDay) {
              // Calculate reset time (tomorrow at midnight)
              const resetTime = new Date(today);
              resetTime.setDate(resetTime.getDate() + 1);
              
              return NextResponse.json({
                success: false,
                dailyLimitReached: true,
                currentDailyUsage: postsCreatedToday,
                dailyLimit: subscriptionPlan.limits.postsPerDay,
                planName: subscriptionPlan.name,
                resetTime: resetTime.toISOString(),
                message: `You've reached your ${subscriptionPlan.name} plan limit of ${subscriptionPlan.limits.postsPerDay} posts per day. Please try again tomorrow or upgrade your subscription.`
              }, { status: 429 });
            }
          }
        }
      } else {
        console.log('No authenticated user found in session');
      }
    } catch (sessionError) {
      console.error('Session error:', sessionError);
      // Continue without user authentication
    }
    
    // If no authenticated user, apply rate limiting for anonymous users
    if (!userId) {
      const ip = request.headers.get('x-forwarded-for') || 'anonymous';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const identifier = `${ip}_${userAgent.substring(0, 20)}`;
      
      const { success, limit, reset, remaining } = await rateLimit.limit(identifier);
      
      if (!success) {
        console.log(`Rate limit exceeded for anonymous user ${identifier}`);
        return NextResponse.json({
          success: false,
          anonymousLimitReached: true,
          message: 'You\'ve reached the limit for anonymous users. Please sign in to continue.'
        }, { status: 429 });
      }
      
      console.log(`Anonymous rate limit check passed. Remaining: ${remaining}, Reset: ${reset}`);
    }
    
    // Parse JSON request body
    let requestData;
    try {
      requestData = await request.json();
      console.log('Request data parsed:', JSON.stringify({
        hasBlogId: !!requestData.blog_id,
        hasTopic: !!requestData.topic,
        hasCategory: !!requestData.category,
        hasAccessToken: !!requestData.access_token
      }));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Invalid JSON in request body'
      }, { status: 400 });
    }
    
    // Validate input parameters
    if (!requestData.blog_id || !requestData.topic || !requestData.access_token) {
      console.log('Missing required parameters');
      return NextResponse.json({
        success: false,
        message: 'Missing required parameters: blog_id, topic, and access_token are required'
      }, { status: 400 });
    }

    const validatedData: PublishRequest = {
      blog_id: requestData.blog_id,
      topic: requestData.topic,
      category: requestData.category || 'general', // Default to general if not provided
      custom_instructions: requestData.custom_instructions || '', // Include custom instructions if provided
      access_token: requestData.access_token
    };
    
    console.log(`Using category: ${validatedData.category} for blog generation`);

    // Generate blog content with Gemini API
    try {
      console.log('Generating content for topic:', validatedData.topic);
      const blogContent = await generateBlogContent(geminiApiKey, validatedData.topic, validatedData.category, validatedData.custom_instructions);
      
      if (!blogContent || blogContent.error) {
        console.error('Content generation failed:', blogContent?.message);
        return NextResponse.json({
          success: false,
          message: blogContent?.message || 'Failed to generate blog content'
        }, { status: 500 });
      }
      
      console.log('Content generated successfully');
      
      // Process the content
      try {
        const processedContent = processContent(blogContent, validatedData);
        console.log('Content processed, title:', processedContent.title);
        
        // Publish to blog
        try {
          console.log('Publishing to blog');
          const publishResult = await publishToBlog(processedContent);
          
          if (!publishResult || publishResult.error) {
            console.error('Publishing failed:', publishResult?.message);
            
            // Check for authentication issues
            if (publishResult?.authError) {
              return NextResponse.json({
                success: false,
                needsReauthentication: true,
                message: 'Authentication expired, please login again'
              }, { status: 401 });
            }
            
            // Handle permission errors
            if (publishResult?.permissionError) {
              return NextResponse.json({
                success: false,
                permissionError: true,
                message: publishResult.message || 'You don\'t have permission to post to this blog'
              }, { status: 403 });
            }
            
            return NextResponse.json({
              success: false, 
              message: publishResult?.message || 'Failed to publish blog post'
            }, { status: 500 });
          }
          
          // Save to MongoDB if successful and user is authenticated
          if (userId && userEmail) {
            try {
              console.log('Saving blog post data to database');
              // Update user settings if needed
              const updates: UserUpdates = {};
              
              const user = await User.findOne({ _id: userId });
              if (user) {
                if (validatedData.blog_id && !user.blog_id) {
                  updates.blog_id = validatedData.blog_id;
                }
                
                // Increment usage count for subscription
                await User.updateOne(
                  { _id: userId },
                  { 
                    $set: updates,
                    $inc: { 'subscription.currentUsage': 1 } 
                  }
                );
                console.log('Updated user settings and incremented usage count');
              }
              
              // Create blog post record
              const blogPost = await BlogPost.create({
                title: publishResult.title || processedContent.title,
                topic: validatedData.topic,
                category: validatedData.category,
                url: publishResult.url,
                user: userId,
                content: processedContent.content || null,
              });
              
              console.log('Blog post saved to database with ID:', blogPost._id);
            } catch (dbError) {
              // Don't fail the request if database saving fails
              console.error('Error saving to database:', dbError);
            }
          } else {
            console.log('Skipping database save - no authenticated user found');
          }
          
          console.log('Successfully published to blog');
          return NextResponse.json({
            success: true,
            url: publishResult.url,
            title: publishResult.title,
            published: publishResult.published,
            category: validatedData.category
          });
          
        } catch (publishError) {
          console.error('Publish error:', publishError);
          return NextResponse.json({
            success: false,
            message: publishError instanceof Error ? publishError.message : 'Failed to publish blog post'
          }, { status: 500 });
        }
        
      } catch (processError) {
        console.error('Processing error:', processError);
        return NextResponse.json({
          success: false,
          message: processError instanceof Error ? processError.message : 'Failed to process content'
        }, { status: 500 });
      }
      
    } catch (genError) {
      console.error('Content generation error:', genError);
      return NextResponse.json({
        success: false,
        message: genError instanceof Error ? genError.message : 'Failed to generate blog content'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Unhandled error in publish endpoint:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

// Function to generate blog content using Gemini API
async function generateBlogContent(apiKey: string, topic: string, category: string = 'general', customInstructions: string = '') {
  try {
    console.log('Starting Gemini API request for category:', category);
    
    // Get the category-specific prompt
    const prompt = getCategoryPrompt(category, topic);
    
    // Add custom instructions if provided
    const finalPrompt = customInstructions 
      ? `${prompt}\n\nCustom Instructions: ${customInstructions}\n\nDon't use any markdown element such as #, ##, ###, *, **, etc.`
      : `${prompt} Don't use any markdown element such as #, ##, ###, *, **, etc.`;
    
    console.log('Using custom instructions:', !!customInstructions);
    
    // Add timeout control with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 second timeout
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: finalPrompt
                }
              ]
            }
          ]
        }),
        signal: controller.signal // Add AbortController signal
      }
    );
    
    // Clear the timeout since the request completed
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return {
        error: true,
        message: `Gemini API error: ${response.status} - ${errorText}`
      };
    }

    const data = await response.json();
    console.log('Gemini API response received');
    console.log('Response data:', JSON.stringify(data)); 
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
      console.error('Invalid Gemini API response structure:', JSON.stringify(data));
      return {
        error: true,
        message: 'Failed to generate blog content: Invalid response structure from Gemini API'
      };
    }
    
    return data;
  } catch (error) {
    console.error('Error in Gemini API call:', error);
    
    // Special handling for timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        error: true,
        message: 'Request to Gemini API timed out after 50 seconds. Please try again.'
      };
    }
    
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Failed to generate blog content'
    };
  }
}

// Function to process content 
function processContent(response: any, validatedData: PublishRequest) {
  try {
    console.log('Processing content');
    const text = response.candidates[0].content.parts[0].text;
    const lines = text.split('\n\n');
    
    if (lines.length < 2) {
      console.error('Content has insufficient lines:', lines.length);
      throw new Error('Generated content format is invalid');
    }
    
    // Extract and clean the title (remove any HTML tags)
    const title = lines[0].replace(/<\/?[^>]+(>|$)/g, '').trim();
    
    // Process the content and remove prohibited HTML tags
    let content = lines.slice(1).join('\n\n').trim();
    
    // Remove any full HTML document structure that might be present
    content = content
      // Remove DOCTYPE declarations
      .replace(/<!DOCTYPE[^>]*>/i, '')
      // Remove html, head, body tags
      .replace(/<\/?html[^>]*>/gi, '')
      .replace(/<\/?head[^>]*>/gi, '')
      .replace(/<\/?body[^>]*>/gi, '')
      // Remove meta tags
      .replace(/<meta[^>]*>/gi, '')
      // Remove title tags
      .replace(/<\/?title[^>]*>/gi, '')
      // Remove script and style tags with content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '');
    
    // Further clean up any leftover HTML entities or harmful elements
    content = content
      .replace(/<\/?html[^>]*>/gi, '') // Make sure HTML tags are removed
      .replace(/<\/?head[^>]*>/gi, '') // Make sure HEAD tags are removed
      .replace(/<\/?body[^>]*>/gi, '') // Make sure BODY tags are removed
      .replace(/<\/?iframe[^>]*>/gi, '') // Remove iframe tags
      .replace(/<\/?embed[^>]*>/gi, '') // Remove embed tags
      .replace(/<\/?object[^>]*>/gi, '') // Remove object tags
      .replace(/<\/?script[^>]*>/gi, '') // Remove script tags
      .replace(/<\/?style[^>]*>/gi, ''); // Remove style tags
    
    // Convert any markdown-like syntax that might have slipped through
    content = content
      .replace(/^# (.*?)$/gm, '<h2>$1</h2>') // Convert # headers to h2
      .replace(/^## (.*?)$/gm, '<h3>$1</h3>') // Convert ## headers to h3
      .replace(/^### (.*?)$/gm, '<h4>$1</h4>'); // Convert ### headers to h4
    
    if (!title || !content) {
      console.error('Failed to extract title or content');
      throw new Error('Failed to extract title or content from generated text');
    }
    
    console.log('Extracted title:', title);
    return {
      title: title.trim(),
      content: content.trim(),
      blog_id: validatedData.blog_id,
      access_token: validatedData.access_token
    };
  } catch (error) {
    console.error('Error processing content:', error);
    throw error;
  }
}

// Function to publish to blog
async function publishToBlog(processedContent: any) {
  try {
    console.log('Publishing to blog ID:', processedContent.blog_id);
    
    // Add timeout control with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 second timeout
    
    const response = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${processedContent.blog_id}/posts/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${processedContent.access_token}`
        },
        body: JSON.stringify({
          kind: 'blogger#post',
          title: processedContent.title,
          content: processedContent.content
        }),
        signal: controller.signal // Add AbortController signal
      }
    );
    
    // Clear the timeout since the request completed
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Blogger API error:', response.status, errorText);
      
      // Check for authentication errors (401 Unauthorized)
      if (response.status === 401) {
        console.log('Authentication error detected, token likely expired or invalid');
        try {
          const errorData = JSON.parse(errorText);
          // Check for specific Google OAuth errors
          if (errorData.error?.message?.includes('Invalid Credentials') || 
              errorData.error?.message?.includes('disabled_client') ||
              errorData.error?.message?.includes('invalid_token')) {
            
            return {
              error: true,
              authError: true,
              message: 'Authentication expired, please login again'
            };
          }
        } catch (parseErr) {
          // If we can't parse the error, still mark it as an auth error
          return {
            error: true,
            authError: true,
            message: 'Authentication failed: ' + response.status
          };
        }
      }
      
      // Handle permission errors (403 Forbidden)
      if (response.status === 403) {
        console.log('Permission error detected');
        try {
          const errorData = JSON.parse(errorText);
          
          return {
            error: true,
            permissionError: true,
            message: 'You don\'t have permission to post to this blog. Please verify that you are the owner or have contributor access to blog ID: ' + processedContent.blog_id
          };
        } catch (parseErr) {
          return {
            error: true,
            permissionError: true,
            message: 'Access forbidden: You don\'t have permission to post to this blog'
          };
        }
      }
      
      return {
        error: true,
        message: `Blogger API error: ${response.status} - ${errorText}`
      };
    }

    const data = await response.json();
    console.log('Post published successfully, ID:', data.id);
    
    return data;
  } catch (error) {
    console.error('Error publishing to blog:', error);
    
    // Special handling for timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        error: true,
        message: 'Request to Blogger API timed out after 50 seconds. Please try again.'
      };
    }
    
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Failed to publish blog post'
    };
  }
}