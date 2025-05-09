import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IBlogPost extends Document {
  title: string;
  topic: string;
  category: string;
  url: string;
  content?: string;
  user: mongoose.Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    topic: { type: String, required: true },
    category: { type: String, default: 'general' },
    url: { type: String, required: true },
    content: { type: String },
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

export default mongoose.models.BlogPost || mongoose.model<IBlogPost>('BlogPost', BlogPostSchema);