import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { DEPENDENCY_CHANGE_TYPES } from '../constants/enums.js';
import { RISK_LEVELS } from '../constants/riskLevels.js';

const analysisPackageSchema = new Schema(
  {
    analysisId: { type: Types.ObjectId, ref: 'Analysis', required: true, index: true },
    dependencyId: { type: Types.ObjectId, ref: 'Dependency', index: true },

    name: { type: String, required: true, index: true },
    version: { type: String, required: true },
    previousVersion: { type: String },

    changeType: { type: String, enum: DEPENDENCY_CHANGE_TYPES, required: true },
    isDirect: { type: Boolean, required: true },

    manifestPath: { type: String, required: true },
    dependencyPath: { type: [String], default: [] },

    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    riskLevel: { type: String, enum: RISK_LEVELS, default: 'LOW' },
  },
  { timestamps: true },
);

analysisPackageSchema.index({ analysisId: 1, name: 1, manifestPath: 1 }, { unique: true });

export type AnalysisPackageDoc = InferSchemaType<typeof analysisPackageSchema>;
export const AnalysisPackage = model('AnalysisPackage', analysisPackageSchema);
