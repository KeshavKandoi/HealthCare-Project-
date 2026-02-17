import mongoose from 'mongoose';



const connectDB=async()=>{
  mongoose.connection.on("connected",()=>{
    console.log("MONGOdb DATABASE CONNECTED")
  })
  await mongoose.connect(`${process.env.MONGO_LOCAL_URL}/doctorapp`)
}


export default connectDB