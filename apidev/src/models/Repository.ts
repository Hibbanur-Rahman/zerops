import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const securityPolicySchema = new Schema(
  {
    failOnCritical: { type: Boolean, default: true },
    failOnHigh: { type: Boolean, default: false },
    failOnMedium: { type: Boolean, default: false },
    maximumRiskScore: { type: Number, min: 0, max: 100, default: 80 },
    allowNewDependencies: { type: Boolean, default: true },
    allowDeprecatedPackages: { type: Boolean, default: true },
    allowInstallScripts: { type: Boolean, default: true },
  },
  { _id: false },
);

const repositorySchema = new Schema(
  {
    githubRepositoryId: { type: Number, required: true, unique: true },
    installationId: { type: Types.ObjectId, ref: 'GithubInstallation', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    owner: { type: String, required: true },
    private: { type: Boolean, default: false },
    defaultBranch: { type: String, default: 'main' },
    htmlUrl: { type: String, required: true },
    description: { type: String },

    monitoringEnabled: { type: Boolean, default: false, index: true },
    fullScanEnabled: { type: Boolean, default: false },

    policy: { type: securityPolicySchema, default: () => ({}) },

    securityScore: { type: Number, min: 0, max: 100, default: null },
    lastScanAt: { type: Date },
    lastAnalysisId: { type: Types.ObjectId, ref: 'Analysis' },

    removedFromInstallationAt: { type: Date },
  },
  { timestamps: true },
);

export type RepositoryDoc = InferSchemaType<typeof repositorySchema>;
export type SecurityPolicy = InferSchemaType<typeof securityPolicySchema>;
export const Repository = model('Repository', repositorySchema);
