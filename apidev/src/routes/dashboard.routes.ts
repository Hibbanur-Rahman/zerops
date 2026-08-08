import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getActivity, getOverview, getRiskDistribution } from '../controllers/dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get('/overview', getOverview);
dashboardRouter.get('/activity', getActivity);
dashboardRouter.get('/risk-distribution', getRiskDistribution);
