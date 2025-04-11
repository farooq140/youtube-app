import { Router } from 'express';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';
import {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
} from '../controllers/video.controller.js';

const router = Router();
router.use(verifyJwt); // this verifyJwt apply to all routes in this file
router
  .route('/')
  .get(getAllVideos) // DONE in progress problem with search
  .post(
    upload.fields([
      {
        name: 'videoFile',
        maxCount: 1,
      },
      {
        name: 'thumbnail',
        maxCount: 1,
      },
    ]),
    publishAVideo // DONE ok
  );
router
  .route('/:videoId')
  .get(getVideoById) // DONE ok
  .patch(upload.single('thumbnail'), updateVideo) // DONE Ok
  .delete(deleteVideo);
router.route('/:videoId/publish').patch(togglePublishStatus); // DONE ok
export default router;
