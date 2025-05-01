import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import BlogPost from '@/models/BlogPost';

// Define the dynamic export for API routes
export const dynamic = 'force-dynamic';

// Define the input types
interface PublishRequest {
  gemini_api_key: string;
  blog_id: string;
  topic: string;
  access_token: string;
}

interface UserUpdates {
  blog_id?: string;
  gemini_api_key?: string;
}

export async function POST(request: Request) {
  try {
    console.log('Starting publish endpoint processing');
    
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
    try {
      const session = await getIronSession<SessionData>(request, new Response(), sessionOptions);
      if (session.isLoggedIn && session.user?.email) {
        userEmail = session.user.email;
        const user = await User.findOne({ email: session.user.email });
        if (user) {
          userId = user._id;
          console.log('Found user:', userId);
        }
      } else {
        console.log('No authenticated user found in session');
      }
    } catch (sessionError) {
      console.error('Session error:', sessionError);
      // Continue without user authentication
    }
    
    // Parse JSON request body
    let requestData;
    try {
      requestData = await request.json();
      console.log('Request data parsed:', JSON.stringify({
        hasGeminiKey: !!requestData.gemini_api_key,
        hasBlogId: !!requestData.blog_id,
        hasTopic: !!requestData.topic,
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
    if (!requestData.gemini_api_key || !requestData.blog_id || !requestData.topic || !requestData.access_token) {
      console.log('Missing required parameters');
      return NextResponse.json({
        success: false,
        message: 'Missing required parameters: gemini_api_key, blog_id, topic, and access_token are required'
      }, { status: 400 });
    }

    const validatedData: PublishRequest = {
      gemini_api_key: requestData.gemini_api_key,
      blog_id: requestData.blog_id,
      topic: requestData.topic,
      access_token: requestData.access_token
    };

    // Generate blog content with Gemini API
    try {
      console.log('Generating content for topic:', validatedData.topic);
      const blogContent = await generateBlogContent(validatedData.gemini_api_key, validatedData.topic);
      
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
                
                if (validatedData.gemini_api_key && !user.gemini_api_key) {
                  updates.gemini_api_key = validatedData.gemini_api_key;
                }
                
                if (Object.keys(updates).length > 0) {
                  await User.updateOne({ _id: userId }, { $set: updates });
                  console.log('Updated user settings');
                }
              }
              
              // Create blog post record
              const blogPost = await BlogPost.create({
                title: publishResult.title || processedContent.title,
                topic: validatedData.topic,
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
            published: publishResult.published
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
async function generateBlogContent(apiKey: string, topic: string) {
  try {
    console.log('Starting Gemini API request');
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
                  text: `You are a professional content writer specialist and write articles to explain new and complex topics in simple and easy to understand language. The articles are SEO friendly, keyword rich and hook users within seconds with catchy title and 800 to 1300 words. I will use this article on blogger in html mode. Strictly just write the title and content in pure html tags with formatting on topic ${topic}.
Example article (Strictly follow this format):
Google Veo 2: Unleashing the Future of AI Video Generation

<p>Prepare to witness a seismic shift in digital creativity. Google has just unveiled Veo 2, their latest groundbreaking text-to-video AI model, and it's set to redefine how we create and consume video content. As an AI researcher, seeing this level of progress in generative video is nothing short of astonishing.</p>`
                }
              ]
            }
          ]
        }),
      }
    );

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
    
    const title = lines[0].replace(/<h1>|<\/h1>|<h2>|<\/h2>/g, '').trim();
    const content = lines.slice(1).join('\n\n').trim();
    
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
      }
    );

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
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Failed to publish blog post'
    };
  }
}