import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { objectIdParamSchema } from '../validators/common.validators.js';
import { updateFindingStatusSchema } from '../validators/finding.validators.js';
import { getFinding, listFindings, updateFindingStatus } from '../controllers/findings.controller.js';

export const findingsRouter = Router();

findingsRouter.use(requireAuth);
findingsRouter.get('/', listFindings);
findingsRouter.get('/:id', validate(objectIdParamSchema), getFinding);
findingsRouter.patch('/:id/status', validate(updateFindingStatusSchema), updateFindingStatus);
