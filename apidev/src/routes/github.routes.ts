import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { githubCallbackSchema } from '../validators/github.validators.js';
import { callback, connect, getStatus, install, listRepositories } from '../controllers/github.controller.js';
import { handleWebhook } from '../controllers/webhook.controller.js';

export const githubRouter = Router();

githubRouter.get('/connect', requireAuth, connect);
githubRouter.get('/callback', validate(githubCallbackSchema), callback);
githubRouter.get('/install', requireAuth, install);
githubRouter.get('/repositories', requireAuth, listRepositories);
githubRouter.get('/status', requireAuth, getStatus);
githubRouter.post('/webhook', handleWebhook);
