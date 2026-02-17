import { createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../Api/API";

//  get all doctor
export const getAllDoctors=createAsyncThunk(
 "user/getAllDoctors",
 async(_,thunkApi)=>{
   try{
     const res=await API.get("/doctor/get-all")
     return res.data
   }catch(error){
     const message=error?.response?.data?.message||error.message||"get all doc error";
     return thunkApi.rejectWithValue(message);
   }
 }
)
 



//  get doctor details 

export const getDoctorDetails=createAsyncThunk(
  "doctor/getDoctorDetails",
  async(id,thunkApi)=>{
    try{
      const res=await API.get(`/doctor/get-details/${id}`);
      return res.data
    }catch(error){
      const message=error?.response?.data?.message||error.message||"doctor details  error";
      return thunkApi.rejectWithValue(message);
    }
  }
)
  




//  ADD DOCTOR
export const addDoctor =createAsyncThunk(
  "doctor/addDoctor",
  async(formData,thunkApi)=>{
    try{
      const res=await API.post("/doctor/add",formData,{
        header:{
          "Content-Type":"multipart/form-data",
        },
      });
      return res.data
    }catch(error){
      const message=error?.response?.data?.message||error.message||"add new doctor error";
      return thunkApi.rejectWithValue(message);
    }
  }
 )
  


//  UPDATE doctor
export const updateDoctor =createAsyncThunk(
  "doctor/updateDoctor",
  async({id,formData},thunkApi)=>{
    try{
      const res=await API.patch(`/doctor/update/${id}`,formData,{
        header:{
          "Content-Type":"multipart/form-data",
        },
      });
      return res.data
    }catch(error){
      const message=error?.response?.data?.message||error.message||"update doctor error";
      return thunkApi.rejectWithValue(message);
    }
  }
 )
  

 //  DELETE DOCTOR

export const deleteDoctor =createAsyncThunk(
  "doctor/deleteDoctor",
  async(id,thunkApi)=>{
    try{
      const res=await API.delete(`/doctor/delete/${id}`)
      
      return res.data
    }catch(error){
      const message=error?.response?.data?.message||error.message||"delete doctor error";
      return thunkApi.rejectWithValue(message);
    }
  }
 )
  

 //update status doctor

export const updateStatus =createAsyncThunk(
  "doctor/updateStatus",
  async({id,availableStatus},thunkApi)=>{
    try{
      const res=await API.patch(`/doctor/update-status/${id}`,availableStatus)
      
      return res.data
    }catch(error){
      const message=error?.response?.data?.message||error.message||"updatedoctor error";
      return thunkApi.rejectWithValue(message);
    }
  }
 )
  