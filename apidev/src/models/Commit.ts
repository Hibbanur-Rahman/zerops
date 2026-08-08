import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const commitSchema = new Schema(
  {
    repositoryId: { type: Types.ObjectId, ref: 'Repository', required: true, index: true },
    sha: { type: String, required: true },

    authorLogin: { type: String },
    authorGithubId: { type: Number },
    authorName: { type: String },
    authorEmail: { type: String },

    message: { type: String, required: true },
    branch: { type: String, required: true },
    pushedAt: { type: Date, default: () => new Date() },

    changedFiles: { type: [String], default: [] },
    dependencyFilesChanged: { type: Boolean, default: false },
  },
  { timestamps: true },
);

commitSchema.index({ repositoryId: 1, sha: 1 }, { unique: true });

export type CommitDoc = InferSchemaType<typeof commitSchema>;
export const Commit = model('Commit', commitSchema);
