import express from "express";
import { createMessage, deleteWebMessage, getAllMessages } from "../controllers/webMessageController.js";
import { isAdmin, userAuth} from "../middlewares/authMiddlewares.js";

const router=express.Router();

// CREATE MESSAGE||POST

router.post("/create",createMessage)

// GET ALL MESSAGE||GET
router.get("/get-all",getAllMessages);
 
//  DELETE MSG ||DELETE
router.get("/delete:id",userAuth,isAdmin,deleteWebMessage);

export default router;
