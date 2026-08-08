import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { githubRouter } from './github.routes.js';
import { repositoriesRouter } from './repositories.routes.js';
import { analysesRouter } from './analyses.routes.js';
import { findingsRouter } from './findings.routes.js';
import { dependenciesRouter } from './dependencies.routes.js';
import { pullRequestsRouter } from './pullRequests.routes.js';
import { notificationsRouter } from './notifications.routes.js';
import { notificationPreferencesRouter } from './notificationPreferences.routes.js';
import { dashboardRouter } from './dashboard.routes.js';

export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Package Risk Analyzer API',
      version: 'v1',
    },
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/github', githubRouter);
apiRouter.use('/repositories', repositoriesRouter);
apiRouter.use('/analyses', analysesRouter);
apiRouter.use('/findings', findingsRouter);
apiRouter.use('/dependencies', dependenciesRouter);
apiRouter.use('/pull-requests', pullRequestsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/notification-preferences', notificationPreferencesRouter);
apiRouter.use('/dashboard', dashboardRouter);
