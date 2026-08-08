import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { objectIdParamSchema } from '../validators/common.validators.js';
import { getDependency, listDependencies } from '../controllers/dependencies.controller.js';

export const dependenciesRouter = Router();

dependenciesRouter.use(requireAuth);
dependenciesRouter.get('/', listDependencies);
dependenciesRouter.get('/:id', validate(objectIdParamSchema), getDependency);
