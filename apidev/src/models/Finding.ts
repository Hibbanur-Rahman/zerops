import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { DEPENDENCY_TYPES, FINDING_STATUSES } from '../constants/enums.js';
import { RISK_LEVELS } from '../constants/riskLevels.js';
import { riskFactorSchema } from './RiskFactor.js';

const findingVulnerabilitySchema = new Schema(
  {
    vulnerabilityId: { type: Types.ObjectId, ref: 'Vulnerability', required: true },
    sourceId: { type: String, required: true },
    summary: { type: String, required: true },
    severity: { type: String, enum: RISK_LEVELS, required: true },
    cvssScore: { type: Number },
  },
  { _id: false },
);

const findingSchema = new Schema(
  {
    analysisId: { type: Types.ObjectId, ref: 'Analysis', required: true, index: true },
    repositoryId: { type: Types.ObjectId, ref: 'Repository', required: true, index: true },

    packageName: { type: String, required: true, index: true },
    packageVersion: { type: String, required: true },
    manifestPath: { type: String },

    dependencyType: { type: String, enum: DEPENDENCY_TYPES, required: true },
    dependencyPath: { type: [String], default: [] },

    severity: { type: String, enum: RISK_LEVELS, required: true, index: true },
    riskScore: { type: Number, required: true, min: 0, max: 100 },

    status: { type: String, enum: FINDING_STATUSES, default: 'open', index: true },
    resolvedBy: { type: Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    ignoredReason: { type: String },

    factors: { type: [riskFactorSchema], default: [] },
    vulnerabilities: { type: [findingVulnerabilitySchema], default: [] },
  },
  { timestamps: true },
);

findingSchema.index({ createdAt: -1 });
findingSchema.index({ repositoryId: 1, status: 1, severity: 1 });

export type FindingDoc = InferSchemaType<typeof findingSchema>;
export const Finding = model('Finding', findingSchema);
