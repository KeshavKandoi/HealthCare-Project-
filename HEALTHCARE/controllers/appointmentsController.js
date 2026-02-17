import appointmentModel from "../models/appointmentsModel.js";
import userModel from "../models/UserModels.js";
import doctorModel from "../models/doctorModel.js";
// create
 
export const bookAppointment=async(req,res)=>{
  try{
   const {userId,doctorId,amount,slotDate,slotTime}=req.body;
   if(!userId||!doctorId||!amount||!slotTime||!slotDate){
    return res.status(400).send({
      success:false,
      message:"Please Provide all fields",
    })
   }
  const appointment=new appointmentModel({
    userId,doctorId,slotDate,slotTime,amount,
  })
  await appointment.save();
  res.status(201).send({
    success:true,
    message:"Appointment book successfully",
    appointment,
  })
  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"ERROR IN create appointment API"
    })
  }
}

// get all apointments


export const getAllAppointments = async (req, res) => {
  try {
    const appointments = await appointmentModel
      .find({})
      .populate("userId", "name email phone")
      .populate("doctorId", "name email phone");

    res.status(200).send({
      success: true,
      message: "All appointments",
      totalCount: appointments.length,
      appointments,
    });

  } catch (error) {
    console.log(error)
    res.status(500).send({
      success: false,
      message: "ERROR IN get appointment API"
    })
  }
};

// get details

export const getAppointmentDetails=async(req,res)=>{
  try{
    const {id}=req.params
    if(!id){
      return res.status(404).send({
        success:false,
        message:"Error in get appointment details API"
      })
    }
    const appointment=await appointmentModel.findById(id)
    if(!appointment){
      return res.status(404).send({
        success:false,
        message:"No appointment found with this ID"
      })
    }
    // find user and doctor
    const user=await userModel.findOne({_id:appointment?.userId});
    const doctor=await doctorModel.findOne({_id:appointment?.doctorId})
    res.status(200).send({
      success:true,
      message:"Appointment Details fetched successfully",
      appointmentDetails:{
        clientName:user?.name,
        clientPhone:user?.phone,
        clientEmail:user?.email,
        doctorName:doctor?.name,
        doctorPhone:doctor?.phone,
        doctorEmail:doctor?.email,
        bookingDate:appointment?.slotDate,
        bookingTime:appointment?.slotTime,
        amount:appointment?.amount,
        bookingStatus:appointment?.status,
        paymentMode:appointment?.payment,
        createdAt:appointment?.createdAt,

      },
    })


  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"ERROR IN get appointment details API"
    })
  }
}


// change status




export const updateAppointmentStatus=async(req,res)=>{
  try{
    const {id}=req.params
    if(!id){
      return res.status(404).send({
        success:false,
        message:"Error in get appointment details API"
      })
    }

    const {appointmentStatus}=req.body
    if(!appointmentStatus){
      return res.status(404).send({
        success:false,
        message:"please provide appointment status"
      })
    }
    const appointment=await appointmentModel.findByIdAndUpdate(
      id,{$set:{status:appointmentStatus}},
      { returnDocument: "after" }
    );
    res.status(200).send({
      success:true,
      message:"Appointment status Has been updated"
    }); 
  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"ERROR IN updating appointment status API"
    })
  }
}



// user appointment
export const getUserAppointments=async(req,res)=>{
  try{
    const {id}=req.params
    if(!id){
      return res.status(404).send({
        success:false,
        message:"Error in get appointment details API"
      })
    }
    const user=await userModel.findById(id)
    if(!user){
      return res.status(404).send({
        success:false,
        message:"user not found"
      })
    } 
    const appointment=await appointmentModel.find({userId:user?._id})
    res.status(200).send({
      success:true,
      message:"your appointments",
      totalCount:appointment.length,
      appointment,
    })
    
  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"error in get user appointment API"
    })
  }
}

// get user appointment details


export const getUserAppointmentDetails=async(req,res)=>{
  try{
    const {id}=req.params
    if(!id){
      return res.status(404).send({
        success:false,
        message:"Error in get appointment details API"
      })
    }
    const user =await userModel.findById(id)
    if(!user){
      return res.status(404).send({
        success:false,
        message:"No user found with this ID"
      })
    }
    // find appointment and doctor

    const appointment=await appointmentModel.findOne({userId:user?._id})
    const doctor=await doctorModel.findOne({_id:appointment?.doctorId})
    res.status(200).send({
      success:true,
      message:"Appointment Details fetched successfully",
      appointmentDetails:{
        doctorName:doctor?.name,
        doctorPhone:doctor?.phone,
        doctorEmail:doctor?.email,
        bookingDate:appointment?.slotDate,
        bookingTime:appointment?.slotTime,
        amount:appointment?.amount,
        bookingStatus:appointment?.status,
        paymentMode:appointment?.payment,
        createdAt:appointment?.createdAt,

      },
    })


  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"ERROR IN get appointment details API"
    })
  }
}


// update user boooking status

export const cancelAppointment=async(req,res)=>{
  try{
    const {id}=req.params
    if(!id){
      return res.status(404).send({
        success:false,
        message:"provide appointment id"
      })
    }
   const appointment=await appointmentModel.findById(id);
   if(!appointment){
   res.status(200).send({
    success:true,
    message:"no appointment found with this id"
   });
  }
  await appointment.updateOne({$set:{status:'cancel'}})
  res.status(200).send({
    success:true,
    message:"No Appointment found with this Id"
  })
  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"ERROR IN cancel appointment api"
    })
  }
}