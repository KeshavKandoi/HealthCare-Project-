import userModel from "../models/UserModels.js"
import doctorModel from "../models/doctorModel.js"
import appointmentModel from "../models/appointmentsModel.js";
import bcrypt from "bcryptjs"
import JWT from "jsonwebtoken"
 

// Register
export const userRegister =async(req,res)=>{


  try{
    const {name,email,password}=req.body
    // validation
    if(!name||!email||!password){
      return res.status(400).send({
        success:false,
        message:" Please provide All Fields"
      })
    }
    // hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
 
    const userData={name,email,password:hashedPassword}
    // save user
    const newUser=userModel(userData);
    const user=await newUser.save();
    res.status(201).send({
      success:true,
      message:"Register Successfully"
    })


  }catch(error){
console.log(error)
res.status(500).send({
  success:false,
  message:"Something Went Wrong"
})

  }
};


// LOGIN


export const userLogin=async(req,res)=>{

try{
  const {email,password}=req.body

   // validation
   if(!email||!password){
    return res.status(400).send({
      success:false,
      message:" Please provide All Fields"
    })
  }

// find user
  const user=await userModel.findOne({email})
  if(!user){
    return res.status(404).send({
      success:false,
      message:"Please add email or password"
    })
  }
//  match password

const isMatch=await bcrypt.compare(password,user?.password)
if(!isMatch){
  return res.status(401).send({
    success:false,
    message:"invalid Credential"
  })
}

// token 
const token=JWT.sign({id:user?._id},process.env.JWT_SECRET,{
  expiresIn:"7d",
});

user.password=undefined
res.status(200).send({
  success:true,
  message:"login successfully",
  token,
  user
})

}catch(error){
console.log(error)
res.status(500).send({
  success:false,
  message:"Something Went Wrong"
})

  }

}


// update user details 

// export const updateUser=async(req,res)=>{
//   try{
//     const {id}=req.params
//     if(!id){
//       return res.status(404).send({
//         success:false,
//         message:"user id Not found"
//       });
//     }
//     const {name,phone,dob,image,gender,address}=req.body
//     const photoToBase64=req.file&&req.file.buffer.toString("base64")

// const user=await userModel.findByIdAndUpdate(id,{
//   $set:{name,dob,address,phone,gender,image:photoToBase64}
// },{returnOriginal:false})
// res.status(200).send({
//   success:true,
//   message:"Profile Updated Successfully",
//   user,
// })
//   }catch(error){
//     console.log(error);
//     res.status(500).send({
//       success:false,
//       message:"something went wrong in update user api"
//     })
//   }
// }

// after changing  some part

// user details update

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(404).send({
        success: false,
        message: "User ID not found",
      });
    }

    const { name, phone, dob, gender, address } = req.body;

    const updateData = {
      name,
      phone,
      dob,
      gender,
      address,
    };

    // Only update image if file is uploaded
    if (req.file) {
      updateData.image = req.file.buffer.toString("base64");
    }

    const user = await userModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: "after" }  // ✅ fixed warning
    );

    res.status(200).send({
      success: true,
      message: "Profile Updated Successfully",
      user,
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong in update user API",
    });
  }
};

// update password

export const updatePassword=async(req,res)=>{
  try{
    // userid
const {id}=req.params
if(!id){
  return res.status(404).send({
    success:false,
    message:"user id  not found"
  })
}
// req.body
const {oldPassword,newPassword}=req.body
if(!oldPassword||!newPassword){
  return res.status(500).send({
    success:false,
    message:"Please provide old and New password"
  })
}
  // find user
  const user=await userModel.findById(id)
  if(!user){
    return res.status(402).send({
      success:false,
      message:"user not found"
    })
  }
  // check old password
  const isMatch=await bcrypt.compare(oldPassword,user?.password)
  if(!isMatch){
    return res.status(401).send({
      success:false,
      message:"incorrect old password"
    })
  }
  // hashing
  const salt=await bcrypt.genSalt(10);
  const hashedPassword=await bcrypt.hash(newPassword,salt);

  // update

  user.password=hashedPassword
  await user.save();
  res.status(200).send({
    success:true,
    message:"Password Updated Successfully"
  })

}catch(error){
    console.log(error);
    res.status(500).send({
      success:false,
      message:"something went wrong in update user api"
    })
  }

}



// GET ALL USER FOR ADMIN

export const getAllUser =async(req,res)=>{


  try{
    const users=await userModel.find({});
    res.status(200).send({
      success:true,
      message:"All Users",
      totalCount:users.length,
      users,
    })
 
  }catch(error){
console.log(error)
res.status(500).send({
  success:false,
  message:"Error in get all user API"
})

  }
};


// GET USER DEATAILS AND APPOINTMENT DETAILS FOR ADMIN


export const getuserDetails =async(req,res)=>{

  try{
    const {id}=req.params
    if(!id){
      return res.status(404).send({
        success:false,
        message:"user id Not found"
      })
    }
    const user =await userModel.findById(id)
    if(!user){
      return res.status(404).send({
        success:false,
        message:"no user found with this id"
      })
    }
    // find appointment
    const appointments = await appointmentModel
  .find({ userId: id })
  .populate("doctorId");
    res.status(200).send({
      success:true,
      message:"Details Fetched Successfully",
      user,
      appointments,
    })
 
  }catch(error){
console.log(error)
res.status(500).send({
  success:false,
  message:"Error in user details API"
})

  }
};


// GET STATS

export const getStats =async(req,res)=>{


  try{
    const users=await userModel.find({});
    const doctors=await doctorModel.find({})
    const appointments=await appointmentModel.aggregate([
      {$group:{_id:null,totalEarning:{$sum:{$toDouble:"$amount"}}},
    },
    ])
    const total=appointments.length>0?appointments[0].totalEarning:0
    res.status(200).send({
      success:true,
      message:"All Stats",
      stats:{

        totalUsers:users.length,
        totalDoctors:doctors.length,
       earnings:total,

      }
 
    })
 
  }catch(error){
console.log(error)
res.status(500).send({
  success:false,
  message:"Error in get all stats API"
})

  }
};



// GET LOGIN USERS


export const getLoginUser =async(req,res)=>{

  try{
    const {id}=req.params
    if(!id){
      return res.status(404).send({
        success:false,
        message:"user id Not found"
      })
    }
    const user =await userModel.findById(id)
    if(!user){
      return res.status(404).send({
        success:false,
        message:"no user found with this id"
      })
    }
    res.status(200).send({
      success:true,
      message:"login user details",
      user,
    })
  } catch(error){
    console.log(error);
    res.status(500).send({
      success:false,
      message:"NOT FOUND"
    })
  }}