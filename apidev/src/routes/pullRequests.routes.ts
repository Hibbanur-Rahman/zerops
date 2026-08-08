import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { objectIdParamSchema } from '../validators/common.validators.js';
import { getPullRequest, listPullRequests } from '../controllers/pullRequests.controller.js';

export const pullRequestsRouter = Router();

pullRequestsRouter.use(requireAuth);
pullRequestsRouter.get('/', listPullRequests);
pullRequestsRouter.get('/:id', validate(objectIdParamSchema), getPullRequest);
