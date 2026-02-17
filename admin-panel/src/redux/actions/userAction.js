 import { createAsyncThunk } from "@reduxjs/toolkit";
 import API from "../../Api/API";

//  get all users
export const getAllUsers=createAsyncThunk(
  "user/getAllUsers",
  async(_,thunkApi)=>{
    try{
      const res=await API.get("/user/get-all")
      return res.data
    }catch(error){
      const message=error?.response?.data?.message||error.message||"login error";
      return thunkApi.rejectWithValue(message);
    }
  }
)
  



//  get user details 

export const getUserDetails=createAsyncThunk(
  "user/getUserDetails",
  async(id,thunkApi)=>{
    try{
      const res=await API.get(`/user/get-user/${id}`)
      return res.data
    }catch(error){
      const message=error?.response?.data?.message||error.message||"user detailserror";
      return thunkApi.rejectWithValue(message);
    }
  }
)
   


//  get STATS

export const getStats=createAsyncThunk(
  "user/getStats",
  async(_,thunkApi)=>{
    try{
      const res=await API.get("/user/get-stats")
      return res.data
    }catch(error){
      const message=error?.response?.data?.message||error.message||"get-stats error";
      return thunkApi.rejectWithValue(message);
    }
  }
)
   