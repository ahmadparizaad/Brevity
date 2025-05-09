import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  picture?: string;
  blog_id?: string;
  gemini_api_key?: string;
  subscription?: {
    plan: string;
    currentUsage: number;
    nextResetDate: Date;
    startDate: Date;  // Added to track when the subscription started
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    picture: { type: String },
    blog_id: { type: String },
    gemini_api_key: { type: String },
    subscription: {
      plan: { type: String, default: 'free' },
      currentUsage: { type: Number, default: 0 },
      startDate: { type: Date, default: Date.now }, // When subscription starts
      nextResetDate: { type: Date, default: () => {
        // Set next reset date to exactly one month from now
        const today = new Date();
        today.setMonth(today.getMonth() + 1);
        return today;
      }},
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);