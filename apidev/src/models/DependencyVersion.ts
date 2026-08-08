import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const installScriptsSchema = new Schema(
  {
    preinstall: { type: String },
    install: { type: String },
    postinstall: { type: String },
  },
  { _id: false },
);

const dependencyVersionSchema = new Schema(
  {
    dependencyId: { type: Types.ObjectId, ref: 'Dependency', required: true, index: true },
    version: { type: String, required: true },

    publishedAt: { type: Date },
    integritySha: { type: String },
    distTarballUrl: { type: String },

    dependencies: { type: Map, of: String, default: {} },
    peerDependencies: { type: Map, of: String, default: {} },
    optionalDependencies: { type: Map, of: String, default: {} },

    installScripts: { type: installScriptsSchema, default: () => ({}) },
    hasInstallScripts: { type: Boolean, default: false, index: true },

    deprecated: { type: Boolean, default: false },
    deprecationMessage: { type: String },
  },
  { timestamps: true },
);

dependencyVersionSchema.index({ dependencyId: 1, version: 1 }, { unique: true });

export type DependencyVersionDoc = InferSchemaType<typeof dependencyVersionSchema>;
export const DependencyVersion = model('DependencyVersion', dependencyVersionSchema);
