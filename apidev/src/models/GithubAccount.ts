import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const githubAccountSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    githubUserId: { type: Number, required: true, unique: true },
    githubUsername: { type: String, required: true },
    avatarUrl: { type: String },
    profileUrl: { type: String },
    email: { type: String },
    accessTokenEncrypted: { type: String, required: true, select: false },
    refreshTokenEncrypted: { type: String, select: false },
    tokenExpiresAt: { type: Date },
    scopes: { type: [String], default: [] },
    connectedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

export type GithubAccountDoc = InferSchemaType<typeof githubAccountSchema>;
export const GithubAccount = model('GithubAccount', githubAccountSchema);
