import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { PULL_REQUEST_STATES } from '../constants/enums.js';

const pullRequestSchema = new Schema(
  {
    repositoryId: { type: Types.ObjectId, ref: 'Repository', required: true, index: true },
    githubPullRequestId: { type: Number, required: true },
    number: { type: Number, required: true },

    title: { type: String, required: true },
    description: { type: String },

    authorLogin: { type: String, required: true },
    authorGithubId: { type: Number, required: true },
    authorEmail: { type: String },

    baseBranch: { type: String, required: true },
    headBranch: { type: String, required: true },
    baseSha: { type: String, required: true },
    headSha: { type: String, required: true },

    state: { type: String, enum: PULL_REQUEST_STATES, default: 'open', index: true },

    commentId: { type: Number },
    checkRunId: { type: Number },
    latestAnalysisId: { type: Types.ObjectId, ref: 'Analysis' },

    openedAt: { type: Date, default: () => new Date() },
    closedAt: { type: Date },
    mergedAt: { type: Date },
  },
  { timestamps: true },
);

pullRequestSchema.index({ repositoryId: 1, number: 1 }, { unique: true });

export type PullRequestDoc = InferSchemaType<typeof pullRequestSchema>;
export const PullRequest = model('PullRequest', pullRequestSchema);
