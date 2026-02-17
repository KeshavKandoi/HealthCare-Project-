import mongoose from "mongoose"

const doctorSchema= new mongoose.Schema({
  name:{
    type:String,
    required:[true,"name is required"],
  },
  degree:{
    type:String,
    required:[true,"degree is required"],
  },
  speciality:{
    type:String,
    required:[true,"specality is required"],
  },
  experience:{
    type:Number,
    required:[true,"experience is required"],
  },
  fees:{
    type:Number,
    required:[true,"fees is required"],
  },
 
  email:{
    type:String,
    required:[true,"email is required"],
    unique:true,
  },
  image:{
    type:String,
  },
  phone:{
    type:String,
  },

  address:{
    type:String,
  },

  dob:{
    type:String,
  },

  gender:{
    type:String,
  },
  about:{
    type:String,
    required:[true,"about is required"],
  },
  available:{
    type:Boolean,
    default:true,
  },
},{timestamps:true})

const doctorModel=mongoose.model("doctor",doctorSchema)

export default doctorModel;