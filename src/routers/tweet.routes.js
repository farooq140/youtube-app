import { Router } from 'express';
import { verifyJwt } from '../middlewares/auth.middleware.js';
import {
  CreateTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
} from '../controllers/tweet.controller.js';

const router = Router();
router.use(verifyJwt);

router.route('/').post(CreateTweet); // DONE ok
router.route('/user/:userId').get(getUserTweets); // DONE ok
router.route('/:tweetId').patch(updateTweet); // DONE ok
router.route('/:tweetId').delete(deleteTweet); //DONE ok

export default router;
