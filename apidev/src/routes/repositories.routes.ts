import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { objectIdParamSchema } from '../validators/common.validators.js';
import { updateRepositorySchema } from '../validators/repository.validators.js';
import { getRepository, listRepositories, triggerScan, updateRepository } from '../controllers/repositories.controller.js';

export const repositoriesRouter = Router();

repositoriesRouter.use(requireAuth);

repositoriesRouter.get('/', listRepositories);
repositoriesRouter.get('/:id', validate(objectIdParamSchema), getRepository);
repositoriesRouter.patch('/:id', validate(updateRepositorySchema), updateRepository);
repositoriesRouter.post('/:id/scan', validate(objectIdParamSchema), triggerScan);
