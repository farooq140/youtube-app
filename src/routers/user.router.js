import { Router } from 'express';
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAssessToken,
  updateUserAvatar,
  changeUserPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
} from '../controllers/user.conroller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';
const router = Router();

router.route('/register').post(
  upload.fields([
    {
      name: 'avatar',
      maxCount: 1,
    },

    {
      name: 'coverImage',
      maxCount: 1,
    },
  ]),
  registerUser // ok
);
router.route('/login').post(loginUser); //ok

//secure route
router.route('/logout').post(verifyJwt, logoutUser); //ok
router.route('/refresh-token').post(refreshAssessToken); //ok
router.route('/change-password').post(verifyJwt, changeUserPassword); //ok
router.route('/current-user').get(verifyJwt, getCurrentUser); //ok
router.route('/update-details').patch(verifyJwt, updateAccountDetails); //ok
router
  .route('/updateAvatar')
  .patch(verifyJwt, upload.single('avatar'), updateUserAvatar); //ok
router
  .route('/updateCoverImage')
  .patch(verifyJwt, upload.single('coverImage'), updateUserCoverImage); //ok
router.route('/channel/:username').get(verifyJwt, getUserChannelProfile); //check in progress
router.route('/watch-history').get(verifyJwt, getWatchHistory); // ok

export default router;
