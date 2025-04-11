import { Router } from 'express';
import { verifyJwt } from '../middlewares/auth.middleware.js';
import {
  getAllComments,
  addComment,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller.js';

const router = Router();
router.use(verifyJwt);
router.route('/:videoId').get(getAllComments); // ok still little more need to understand
router.route('/:videoId').post(addComment); // ok
router.route('/:commentId').patch(updateComment); // ok
router.route('/:commentId').delete(deleteComment); //ok
export default router;
