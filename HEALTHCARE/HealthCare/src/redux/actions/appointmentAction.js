import { createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../Api/API";

//  get all appointment 
export const getAllAppointments=createAsyncThunk(
  "appointment/getAllAppointments",
  async(_,thunkApi)=>{
    try{
      const res=await API.get("/appointment/get-all")
      return res.data
    }catch(error){
      const message=error?.response?.data?.message||error.message||"get all appointment error";
      return thunkApi.rejectWithValue(message);
    }
  }
 );
  


//  getappointments details 

export const getAppointmentDetails=createAsyncThunk(
  "appointment/getAppointmentDetails",
  async(id,thunkApi)=>{
    try{
      const res=await API.get(`/appointment/get-details/${id}`);
      return res.data;

    }catch(error){
      const message=error?.response?.data?.message||error.message||"doctor details  error";
      return thunkApi.rejectWithValue(message);
    }
  }
)
  

 //update status appointment

 export const updateAppointmentStatus=createAsyncThunk(
  "appointment/updateAppointmentStatus",
  async({id,appointmentStatus},thunkApi)=>{
    try{
      const res=await API.patch(`/appointment/update-status/${id}`,{appointmentStatus,})
      
      return res.data
    }catch(error){
      const message=error?.response?.data?.message||error.message||"updateAppointment/ipdate-status error";
      return thunkApi.rejectWithValue(message);
    }
  }
 )
  

//  appointment action 
