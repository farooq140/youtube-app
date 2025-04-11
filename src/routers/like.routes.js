import { Router } from 'express';
import {
  getLikedVideos,
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
} from '../controllers/like.controller.js';

import { verifyJwt } from '../middlewares/auth.middleware.js';
const router = Router();
router.use(verifyJwt);
router.route('/toggle/v/:videoId').post(toggleVideoLike); //DONE ok
router.route('/toggle/c/:commentId').post(toggleCommentLike); // DONE ok
router.route('/toggle/t/:tweetId').post(toggleTweetLike); // DONE ok
router.route('/').get(getLikedVideos); // in progress
export default router;
