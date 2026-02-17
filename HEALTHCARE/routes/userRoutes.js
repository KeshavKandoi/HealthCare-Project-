import express from "express"
import {userRegister,userLogin,updateUser, updatePassword, getAllUser, getuserDetails, getStats, getLoginUser} from "../controllers/UserController.js"
import {isAdmin, userAuth} from "../middlewares/authMiddlewares.js"
import upload from "../middlewares/multer.js";

const router = express.Router();


// REGISTER||POST
router.post("/register",userRegister);

// LOGIN||POST

router.post("/login",userLogin);

// UPDATE PROFILE ||PATCH

router.patch("/update/:id",userAuth,upload.single("image"), updateUser)


// update password ||patch
router.patch("/update-password/:id",userAuth,updatePassword);

// GET ALL USER||GET
router.get("/get-all",userAuth,isAdmin,getAllUser);

// GET USERS DETAILS ||GET
router.get("/get-user/:id",userAuth,isAdmin,getuserDetails);


//GET ALL STATS ||GET
router.get("/get-stats",userAuth,isAdmin,getStats);

// GET LOGIN USERS DETAILS||GET

router.get("/get-login-user/:id",userAuth,getLoginUser);


export default router