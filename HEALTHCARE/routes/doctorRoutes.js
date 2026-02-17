import express from "express";
import { isAdmin,userAuth } from "../middlewares/authMiddlewares.js";
import upload from "../middlewares/multer.js";
import { addDoctor, deleteDoctor, getAllDoctor, getDoctorDetails, updateAvailableStatus, updateDoctor } from "../controllers/doctorController.js";

const router=express.Router()

// ADD DOCTOR ||POST
router.post("/add",userAuth,isAdmin,upload.single("image"),addDoctor)

// GET ALL DOCTORS||GET
router.get("/get-all",getAllDoctor)


// GET DOCTOR DETAILS||GET
router.get("/get-details/:id",getDoctorDetails)



// ADD DOCTOR ||POST
router.patch("/update/:id",userAuth,isAdmin,upload.single("image"),updateDoctor)

// DELETE DOCTOR ||DELETE
router.delete("/delete/:id",userAuth,isAdmin,deleteDoctor)

// AVAILABLE STATUS UPDATE||PATCH
router.patch("/update-status/:id",userAuth,isAdmin,updateAvailableStatus)

export default router