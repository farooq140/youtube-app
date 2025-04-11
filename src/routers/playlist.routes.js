import { Router } from 'express';
import { verifyJwt } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
import {
  createPlaylist,
  updatePlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
} from '../controllers/playlist.controller.js';
const router = Router();
router.use(verifyJwt, upload.none());

router.route('/').post(createPlaylist); // in progress
router
  .route('/:playlistId')
  .get(getPlaylistById)
  .patch(updatePlaylist)
  .delete(deletePlaylist);
router.route('/:playlistId/videos').post(addVideoToPlaylist);
router.route('/:playlistId/videos').delete(removeVideoFromPlaylist);
router.route('/user/:userId').get(getUserPlaylists);
export default router;
