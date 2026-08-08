import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { GITHUB_ACCOUNT_TYPES, INSTALLATION_STATUSES, REPOSITORY_SELECTIONS } from '../constants/enums.js';

const githubInstallationSchema = new Schema(
  {
    installationId: { type: Number, required: true, unique: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    accountId: { type: Number, required: true },
    accountLogin: { type: String, required: true },
    accountType: { type: String, enum: GITHUB_ACCOUNT_TYPES, required: true },
    accountAvatarUrl: { type: String },
    targetType: { type: String },
    repositorySelection: { type: String, enum: REPOSITORY_SELECTIONS, default: 'selected' },
    permissions: { type: Map, of: String, default: {} },
    events: { type: [String], default: [] },
    status: { type: String, enum: INSTALLATION_STATUSES, default: 'active', index: true },
    suspendedAt: { type: Date },
    installedAt: { type: Date, default: () => new Date() },
    uninstalledAt: { type: Date },
  },
  { timestamps: true },
);

export type GithubInstallationDoc = InferSchemaType<typeof githubInstallationSchema>;
export const GithubInstallation = model('GithubInstallation', githubInstallationSchema);
