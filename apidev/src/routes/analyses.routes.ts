import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { objectIdParamSchema } from '../validators/common.validators.js';
import { getAnalysis, listAnalyses } from '../controllers/analyses.controller.js';

export const analysesRouter = Router();

analysesRouter.use(requireAuth);
analysesRouter.get('/', listAnalyses);
analysesRouter.get('/:id', validate(objectIdParamSchema), getAnalysis);
