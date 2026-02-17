import React, { useEffect } from 'react'
import { useState } from 'react';
import {toast} from "react-hot-toast"
import {useNavigate} from "react-router-dom"
import {useDispatch} from "react-redux"
import { useSelector } from "react-redux";
import { login } from '../../redux/actions/authAction';
import { reset } from '../../redux/slice/authSlice';





const Login=()=> {

  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");

  const navigate=useNavigate()
  const dispatch=useDispatch()


  const handleLogin=()=>{
    if(!email||!password){
      return toast.error("please provide email or password")
    }
    dispatch(login({email,password}))
  };

  const {success,error}=useSelector(state=>state.auth)
  useEffect(()=>{
    if(success){
      toast.success("Login successfully")
      navigate("/home")
      dispatch(reset());
    }
    if(error){
      toast.error(error)
      dispatch(reset())
    }
  },[success,error,dispatch,navigate])
   
  return (
<>
      <div className='d-flex flex-column align-items-center justify-content-center' style={{minHeight:"80vh"}}>

        <h1>Admin panel </h1>

  <div className="mb-3">
    <label  className="form-label">Email address</label>
    <input type="email" className="form-control" value={email} onChange={(e)=>setEmail(e.target.value)} />
  </div>


  <div className="mb-3">
    <label  className="form-label">Password</label>
    <input type="password" className="form-control" value={password} onChange={(e)=>setPassword
      (e.target.value)} />
  </div>
  
  <button className='btn btn-primary' onClick={handleLogin}>Login</button>
      </div>

      </>
  )
}

export default Login
