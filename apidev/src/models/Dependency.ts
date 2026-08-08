import { Schema, model, type InferSchemaType } from 'mongoose';
import { ECOSYSTEMS } from '../constants/enums.js';

const dependencySchema = new Schema(
  {
    name: { type: String, required: true },
    ecosystem: { type: String, enum: ECOSYSTEMS, default: 'npm' },

    latestVersion: { type: String },
    description: { type: String },
    homepage: { type: String },
    repositoryUrl: { type: String },
    license: { type: String },

    maintainersCount: { type: Number },
    weeklyDownloads: { type: Number },

    firstPublishedAt: { type: Date },
    lastPublishedAt: { type: Date },

    isDeprecated: { type: Boolean, default: false },
    deprecationMessage: { type: String },

    metadataFetchedAt: { type: Date },
    metadataStale: { type: Boolean, default: true },
  },
  { timestamps: true },
);

dependencySchema.index({ name: 1, ecosystem: 1 }, { unique: true });

export type DependencyDoc = InferSchemaType<typeof dependencySchema>;
export const Dependency = model('Dependency', dependencySchema);
