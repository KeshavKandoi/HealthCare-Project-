import express from "express"
import { bookAppointment, cancelAppointment, getAllAppointments, getAppointmentDetails, getUserAppointmentDetails, getUserAppointments, updateAppointmentStatus } from "../controllers/appointmentsController.js"
import { isAdmin, userAuth } from "../middlewares/authMiddlewares.js"

const router=express.Router()

// CREATE ||POST
router.post("/create",userAuth,bookAppointment)

//GET ALL ||GET
router.get("/get-all",userAuth,isAdmin, getAllAppointments)


//GET Details ||GET
router.get("/get-details/:id",userAuth,isAdmin, getAppointmentDetails)


// Update status||PATCH

router.patch("/update-status/:id",userAuth,isAdmin,updateAppointmentStatus)


//GET ALL  user appointment||GET
router.get("/get-user-appointments/:id",userAuth, getUserAppointments)


//GET ALL ||GET
router.get("/get-user-appointment-details/:id",userAuth,getUserAppointmentDetails)

// update user boooking status CANCEL ||post
router.post("/cancel/:id",userAuth,cancelAppointment)

export default router;


