import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { githubRouter } from './github.routes.js';

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

// Feature routers are mounted here incrementally as they are implemented:
// apiRouter.use('/repositories', repositoriesRouter);
// apiRouter.use('/analyses', analysesRouter);
// apiRouter.use('/findings', findingsRouter);
// apiRouter.use('/dependencies', dependenciesRouter);
// apiRouter.use('/pull-requests', pullRequestsRouter);
// apiRouter.use('/notifications', notificationsRouter);
// apiRouter.use('/notification-preferences', notificationPreferencesRouter);
// apiRouter.use('/dashboard', dashboardRouter);
