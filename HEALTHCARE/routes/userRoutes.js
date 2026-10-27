import express from "express"
import {userRegister,userResendSignupCode,userVerifySignupCode,userRequestPasswordReset,userConfirmPasswordReset,userLogin,userRefresh,userLogout,updateUser, updatePassword, getAllUser, getuserDetails, getStats, getLoginUser} from "../controllers/UserController.js"
import {isAdmin, userAuth} from "../middlewares/authMiddlewares.js"
import upload from "../middlewares/multer.js";
import {patientAuth} from "../middlewares/ecgAuth.js";
import { authRateLimit } from '../lib/accountAuth.js';
const own=(req,res,next)=>req.params.id===req.patientId?next():res.status(403).json({message:"Forbidden"});

const router = express.Router();


// REGISTER||POST
router.post("/register",authRateLimit,userRegister);
router.post("/register/resend-code",authRateLimit,userResendSignupCode);
router.post("/register/verify-code",authRateLimit,userVerifySignupCode);
router.post("/password/forgot",authRateLimit,userRequestPasswordReset);
router.post("/password/reset",authRateLimit,userConfirmPasswordReset);

// LOGIN||POST

router.post("/login",authRateLimit,userLogin);
router.post("/refresh",userRefresh);
router.post("/logout",userLogout);

// UPDATE PROFILE ||PATCH

router.patch("/update/:id",patientAuth,own,upload.single("image"), updateUser)


// update password ||patch
router.patch("/update-password/:id",patientAuth,own,updatePassword);

// GET ALL USER||GET
router.get("/get-all",userAuth,isAdmin,getAllUser);

// GET USERS DETAILS ||GET
router.get("/get-user/:id",userAuth,isAdmin,getuserDetails);


//GET ALL STATS ||GET
router.get("/get-stats",userAuth,isAdmin,getStats);

// GET LOGIN USERS DETAILS||GET

router.get("/get-login-user/:id",patientAuth,own,getLoginUser);


export default router
