import { Router } from 'express';
import { verifyJwt } from '../middlewares/auth.middleware.js';
import {
  toggleSubcription,
  getUserChannelSubscribers,
  getSubscribedChannels,
} from '../controllers/subscription.controller.js';

const router = Router();
router.use(verifyJwt);
router
  .route('/c/:channelId')
  .post(toggleSubcription)
  .get(getUserChannelSubscribers);
router.route('/u/:channelId').get(getSubscribedChannels);
export default router;
