import {Router} from "express";
import { loginUser, logoutUser, registerUser,refreshAssessToken } from "../controllers/user.conroller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
const router=Router();

router.route("/register").post(
     upload.fields([
          {
               name:"avatar",
               maxCount:1
          },
          {
               name:"coverImage",
               maxCount:1
          }
     ]),
     registerUser)
router.route("/login").post(loginUser)


//secure route
router.route("/logout").post(verifyJwt,logoutUser)
router.route("/refresh-token").post(refreshAssessToken)
export default router