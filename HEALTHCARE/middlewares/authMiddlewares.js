import JWT from "jsonwebtoken"
import userModel from "../models/UserModels.js";


// user

export const userAuth=async(req,res,next)=>{
  try{
    const token=req.headers.authorization;
    if(!token){
      return res.status(401).json({
        success:false,
        message:"Not Authorizes User",
      });
    }
    const actualToken = token.split(" ")[1];
 const decode=JWT.verify(actualToken,process.env.JWT_SECRET);
 req.user=decode;
 next();
  }catch(error){
    console.log(error);
     res.status(402).send({
      success:false,
      message:"ERROR in USER AUTH"
     })
  }
}

// admin
export const isAdmin=async(req,res,next)=>{
try{
  const user=await userModel.findById(req.user.id);
  if (!user || user.isAdmin !== true) {
    return res.status(402).send({
      success:false,
      message:"Unauthorized Access",
    })
  }else{
    next()
  }

}
  catch(error){
    console.log(error);
    res.status(402).send({
      success:false,
      message:"error in admin Auth",
      error
    })
  }
}

 