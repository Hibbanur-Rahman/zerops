import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { ANALYSIS_STATUSES, ANALYSIS_TYPES } from '../constants/enums.js';
import { RISK_LEVELS } from '../constants/riskLevels.js';

const providerStatusSchema = new Schema(
  {
    provider: { type: String, required: true },
    available: { type: Boolean, required: true },
    error: { type: String },
    checkedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const analysisSummarySchema = new Schema(
  {
    totalDependencies: { type: Number, default: 0 },
    directDependencies: { type: Number, default: 0 },
    transitiveDependencies: { type: Number, default: 0 },
    newDependencies: { type: Number, default: 0 },
    removedDependencies: { type: Number, default: 0 },
    updatedDependencies: { type: Number, default: 0 },
    vulnerabilities: { type: Number, default: 0 },
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 },
  },
  { _id: false },
);

const analysisSchema = new Schema(
  {
    repositoryId: { type: Types.ObjectId, ref: 'Repository', required: true, index: true },
    analysisType: { type: String, enum: ANALYSIS_TYPES, required: true },
    status: { type: String, enum: ANALYSIS_STATUSES, default: 'pending', index: true },

    commitSha: { type: String, index: true },
    branch: { type: String },

    pullRequestId: { type: Types.ObjectId, ref: 'PullRequest' },
    pullRequestNumber: { type: Number, index: true },
    headSha: { type: String },
    baseSha: { type: String },

    triggeredByLogin: { type: String },
    triggeredByGithubId: { type: Number },

    manifestPaths: { type: [String], default: [] },

    startedAt: { type: Date },
    completedAt: { type: Date },

    summary: { type: analysisSummarySchema, default: () => ({}) },

    securityScore: { type: Number, min: 0, max: 100 },
    overallRisk: { type: String, enum: RISK_LEVELS },

    providerStatus: { type: [providerStatusSchema], default: [] },

    error: { type: String },
  },
  { timestamps: true },
);

// Idempotency for push/manual/initial analyses: one analysis per repo+commit+type.
analysisSchema.index(
  { repositoryId: 1, commitSha: 1, analysisType: 1 },
  { unique: true, partialFilterExpression: { analysisType: { $in: ['push', 'manual', 'initial'] } } },
);

// Idempotency for PR analyses: one analysis per repo+PR number+head SHA.
analysisSchema.index(
  { repositoryId: 1, pullRequestNumber: 1, headSha: 1 },
  { unique: true, partialFilterExpression: { analysisType: 'pull_request' } },
);

analysisSchema.index({ createdAt: -1 });

export type AnalysisDoc = InferSchemaType<typeof analysisSchema>;
export const Analysis = model('Analysis', analysisSchema);
