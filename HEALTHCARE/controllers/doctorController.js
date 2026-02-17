import doctorModel from "../models/doctorModel.js"

// add doctor

export const addDoctor=async(req,res)=>{

try{
  const {name,email,degree,fees,about,gender,phone,address,image,speciality,experience}=req.body
  if(!name||!email||!degree||!fees||!about||!gender||!phone||!address||!speciality||!experience){
    return res.status(500).send({
      success:false,
      message:"Please Provide All Fields"
    })
  }

  const photoBase64=req.file&&req.file.buffer.toString("base64")

  if(!req.file){
    return res.status(400).send({
      success:false,
      message:"Please Upload Image"
    })
  }
  const doctorData={name,email,degree,fees,about,gender,phone,address,image:photoBase64,speciality,experience}
  const doctor=new doctorModel(doctorData)
  await doctor.save()
  res.status(201).send({
    success:true,
    message:"Doctor Created",
    doctor
  })

}catch(error){
  console.log(error)
  res.status(500).send({
    success:false,
    message:"error in add Doctor Api",
    error
  })
}

}

// get ALL DOCTOR

export const getAllDoctor=async(req,res)=>{
  try{
    const doctors=await doctorModel.find({});
    res.status(200).send({
      success:true,
      message:"All Doctor list",
      totalCount:doctors.length,
      doctors
    })

  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"ERROR IN GET ALL DOCTOR"
    })
  }
}

// get single doctor details



export const getDoctorDetails=async(req,res)=>{
  try{
  const {id}=req.params
  if(!id){
    return res.status(404).send({
      success:false,
      message:"Please add doctor id"
    })
  }
  const doctor=await doctorModel.findById(id)
  if(!doctor){
    return res.status(404).send({
      success:false,
      message:"No doctor Found with This ID"
    })
  }
   res.status(200).send({
    success:true,
    message:"Details Fetched successfully",
    doctor
  })

  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"ERROR IN GET DOCTOR Details"
    })
  }
}


// update doctor



export const updateDoctor=async(req,res)=>{
  try{
    const {id}=req.params
    if(!id){
      return res.status(404).send({
        success:false,
        message:"Please add doctor id"
      })
    }

   
    const photoBase64=req.file&&req.file.buffer.toString("base64")
    const data=req.body;
    if (photoBase64) {
      data.image = photoBase64;
    }
    const doctor=await doctorModel.findByIdAndUpdate(id,
    {$set:data},
    {returnOriginal:false})
    res.status(200).send({
      success:true,
      message:"Doctor Details Updated"
    })

  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"ERROR IN GET ALL DOCTOR"
    })
  }
}

// delete doctor

export const deleteDoctor=async(req,res)=>{
  try{
    const {id}=req.params
    if(!id){
      return res.status(404).send({
        success:false,
        message:"Please add doctor id"
      })
    }
  await doctorModel.findByIdAndDelete(id);
  res.status(200).send({
    success:true,
    message:"Doctor has been deleted"
  })
  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"error in add Doctor Api",
      error
    })
  }
  
  }
  

  // update available status

export const updateAvailableStatus=async(req,res)=>{
  try{
    const {id}=req.params
    if(!id){
      return res.status(404).send({
        success:false,
        message:"Please add doctor id"
      })
    }
    const{availableStatus}=req.body
    if(!availableStatus){
      return res.status(404).send({
        success:false,
        message:"Please provide available status"
      })
    }
     const doctor=await doctorModel.findByIdAndUpdate(id,
      {$set:{available:availableStatus}},
    {returnOriginal:false}
  );
  
  res.status(200).send({
    success:true,
    message:"Doctor available status has been updated"
  })

  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"error in add Doctor Api",
      error
    })
  }
  
  }
  