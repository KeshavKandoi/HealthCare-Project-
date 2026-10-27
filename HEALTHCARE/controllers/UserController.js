import userModel from "../models/UserModels.js"
import doctorModel from "../models/doctorModel.js"
import appointmentModel from "../models/appointmentsModel.js";
import { signUpAccount, resendSignupCode, verifySignupCode, requestPasswordReset, resetAccountPassword, signInAccount, refreshAccount, changeAccountPassword, logoutAccount } from '../lib/accountAuth.js';
 

// Register
export const userRegister =async(req,res)=>{
  try{
    const {name,email,password}=req.body
    if(!name||!email||!password){
      return res.status(400).send({
        success:false,
        message:" Please provide All Fields"
      })
    }
    const result = await signUpAccount({name,email,password});
    res.status(201).send({
      success:true,
      needsEmailConfirmation: result.needsEmailConfirmation,
      message: result.needsEmailConfirmation ? 'Enter the verification code sent to your email.' : 'Register successfully'
    })


  }catch(error){
console.error('Registration failed', error)
res.status(error.status || 500).send({
  success:false,
  message: error.status ? error.message : 'Unable to create account. Please try again.'
})

  }
};

const validEmail = email => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const validCode = code => typeof code === 'string' && /^\d{6}$/.test(code.trim());

export const userResendSignupCode = async (req, res) => {
  const email = req.body?.email?.trim();
  if (!validEmail(email)) return res.status(400).json({ success: false, message: 'Enter a valid email address' });
  try {
    await resendSignupCode(email);
    res.json({ success: true, message: 'If your signup is pending, a new code has been sent.' });
  } catch (error) {
    console.error('Signup code resend failed', error);
    res.status(429).json({ success: false, message: 'Could not send a new code yet. Please try again later.' });
  }
};

export const userVerifySignupCode = async (req, res) => {
  const email = req.body?.email?.trim();
  const code = req.body?.code?.trim();
  if (!validEmail(email) || !validCode(code)) return res.status(400).json({ success: false, message: 'Enter your email and six digit code' });
  try {
    await verifySignupCode(email, code);
    res.json({ success: true, message: 'Email verified. You can now sign in.' });
  } catch (error) {
    console.error('Signup code verification failed', error);
    res.status(400).json({ success: false, message: 'Invalid or expired code. Request a new code and try again.' });
  }
};

export const userRequestPasswordReset = async (req, res) => {
  const email = req.body?.email?.trim();
  if (!validEmail(email)) return res.status(400).json({ success: false, message: 'Enter a valid email address' });
  try {
    await requestPasswordReset(email);
    res.json({ success: true, message: 'If this email has an account, a reset code has been sent.' });
  } catch (error) {
    console.error('Password reset request failed', error);
    res.status(429).json({ success: false, message: 'Could not send a code yet. Please try again later.' });
  }
};

export const userConfirmPasswordReset = async (req, res) => {
  const email = req.body?.email?.trim();
  const code = req.body?.code?.trim();
  const password = req.body?.password;
  if (!validEmail(email) || !validCode(code) || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Enter your email, six digit code and a password of at least eight characters' });
  }
  try {
    await resetAccountPassword(email, code, password);
    res.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (error) {
    console.error('Password reset verification failed', error);
    res.status(400).json({ success: false, message: 'Invalid or expired code. Request a new code and try again.' });
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

const session=await signInAccount(email,password)
res.status(200).send({
  success:true,
  message:"login successfully",
  ...session
})

}catch(error){
console.error('Login failed', error)
const unconfirmed = error?.code === 'email_not_confirmed' || /email not confirmed/i.test(error?.message || '');
const legacyUnconfirmed = error?.code === 'legacy_unconfirmed';
res.status(legacyUnconfirmed || unconfirmed ? 403 : error.status === 429 ? 429 : 401).send({
  success:false,
  message: legacyUnconfirmed ? error.message : unconfirmed ? 'Email not verified. Request a new code.' : error.status === 429 ? error.message : 'Invalid email or password'
})

  }

}

export const userRefresh = async (req, res) => {
  try {
    const session = await refreshAccount(req.body?.refreshToken);
    res.status(200).json({ success: true, ...session });
  } catch {
    res.status(401).json({ success: false, message: 'Session expired' });
  }
};

export const userLogout = async (req, res) => {
  try { await logoutAccount(req.body?.refreshToken); res.status(204).end(); }
  catch { res.status(503).json({ success: false, message: 'Could not end the session' }); }
};


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
      user: user ? { ...user, password: undefined } : null,
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
const {oldPassword,newPassword}=req.body
if(!oldPassword||!newPassword){
  return res.status(400).send({
    success:false,
    message:"Please provide old and New password"
  })
}
  const user=await userModel.findById(req.params.id)
  if(!user){
    return res.status(404).send({
      success:false,
      message:"user not found"
    })
  }
  await changeAccountPassword(user.authUserId || user._id, user.email, oldPassword, newPassword);
  res.status(200).send({
    success:true,
    message:"Password Updated Successfully"
  })

}catch(error){
    console.error('Password change failed', error);
    res.status(400).send({
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
      users: users.map(({ password, ...user }) => user),
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
      user: { ...user, password: undefined },
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
      user: { ...user, password: undefined },
    })
  } catch(error){
    console.log(error);
    res.status(500).send({
      success:false,
      message:"NOT FOUND"
    })
  }}
