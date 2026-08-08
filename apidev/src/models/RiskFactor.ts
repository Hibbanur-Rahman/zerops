import { Schema, type InferSchemaType } from 'mongoose';
import { RISK_LEVELS } from '../constants/riskLevels.js';

/**
 * Risk factors are always owned by exactly one Finding and never queried on
 * their own, so this is a reusable *subdocument* schema (embedded into
 * Finding.factors) rather than a top-level collection -- a separate
 * collection would only add a join for 1:1-owned data.
 */
export const riskFactorSchema = new Schema(
  {
    factor: { type: String, required: true },
    severity: { type: String, enum: RISK_LEVELS, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    evidence: { type: String, required: true },
    recommendation: { type: String, required: true },
  },
  { _id: false },
);

export type RiskFactorDoc = InferSchemaType<typeof riskFactorSchema>;
