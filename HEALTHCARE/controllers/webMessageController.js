import webmessageModel from "../models/webMessage.js";

// createMessage

export const createMessage=async(req,res)=>{
  try{
    const {name,contact,message}=req.body;
    if(!name||!contact||!message){
      return res.status(402).send({
        success:false,
        message:"Please Provide All Fields",
      })
    }
    const webMessage=new webmessageModel({name,contact,message});
   await  webMessage.save();
    res.status(201).send({
      success:true,
      message:"Your Message sent successfully",
      webMessage,
    })
  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"Error in web Message Api",
      error
    })
  }
}


// GetALL MESSAGE 


export const getAllMessages=async(req,res)=>{
  try{
   const webMessages=await webmessageModel.find({})
    res.status(201).send({
      success:true,
      message:"all web message",
      totalCount:webMessages.length,
      webMessages,
    })
  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"Error in web Message Api",
      error
    })
  }
}


// delete message


export const deleteWebMessage=async(req,res)=>{
  try{
   const {id}=req.params
   if(!id){
    return res.status(404).send({
      success:false,
      message:"Please Provide Message ID"
    })
    
   }
// find message

const  webMessage=await webmessageModel.findByIdAndDelete(id)

res.status(200).send({
  success:true,
  message:"Message has been deleted"
})
  }catch(error){
    console.log(error)
    res.status(500).send({
      success:false,
      message:"Error in delete web  Message Api",
      error
    })
  }
}
