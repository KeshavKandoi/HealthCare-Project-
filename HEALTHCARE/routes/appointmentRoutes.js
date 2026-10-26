import express from "express"
import { bookAppointment, cancelAppointment, getAllAppointments, getAppointmentDetails, getUserAppointmentDetails, getUserAppointments, updateAppointmentStatus } from "../controllers/appointmentsController.js"
import { isAdmin, userAuth } from "../middlewares/authMiddlewares.js"
import { patientAuth } from "../middlewares/ecgAuth.js"

const router=express.Router()

// CREATE ||POST
router.post("/create",patientAuth,(_req,res)=>res.status(410).json({message:"Use verified scheduling at /api/v1/scheduling/book"}))

//GET ALL ||GET
router.get("/get-all",userAuth,isAdmin, getAllAppointments)


//GET Details ||GET
router.get("/get-details/:id",patientAuth, getAppointmentDetails)
router.get("/admin/get-details/:id",userAuth,isAdmin,getAppointmentDetails)


// Update status||PATCH

router.patch("/update-status/:id",userAuth,isAdmin,updateAppointmentStatus)


//GET ALL  user appointment||GET
router.get("/get-user-appointments/:id",patientAuth, getUserAppointments)


//GET ALL ||GET
router.get("/get-user-appointment-details/:id",patientAuth,getUserAppointmentDetails)

// update user boooking status CANCEL ||post
router.post("/cancel/:id",patientAuth,cancelAppointment)

export default router;


