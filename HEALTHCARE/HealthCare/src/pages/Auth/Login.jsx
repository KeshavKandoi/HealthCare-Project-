import React,{useEffect, useState} from 'react'
import "./Auth.css"
import {NavLink, useNavigate} from "react-router-dom"
import toast from "react-hot-toast"
import { useDispatch, useSelector } from 'react-redux'
import { reset } from '../../redux/slice/authSlice'
import { login } from '../../redux/actions/authAction'


const Login =() =>{

  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");

  const navigate=useNavigate()
  const dispatch=useDispatch();

  const {error,success}=useSelector(state=>state.auth)


  const handleSubmit=(e)=>{
    e.preventDefault();
    if(!email||!password){
      return toast.error("Please provide all fields");
    }
    dispatch(login({email,password}))

  }
  useEffect(()=>{
    if(success){
      toast.success("Register successfully");
      navigate("/doctors");
      setEmail("");
      setPassword("");
    }
    if(error){
      toast.error(error);
      dispatch(reset())
    }

  },[dispatch,success,error,navigate])
  

  return (
    <>
    <div className='auth-container'>
      <div className='card'>
      <h2>Login</h2>
      <p>Please enter your Email and Password</p>
      
      <form>

  

   
      <div className='form-group mb-3'>
   <input 
    type="text"
    placeholder='Enter your email'
    value={email}
    onChange={(e)=>setEmail(e.target.value)}/>
      </div>


   
      <div className='form-group mb-3'>
   <input 
    type="password"
    placeholder='Enter your password'
    value={password}
    onChange={(e)=>setPassword(e.target.value)}/>
      </div>

<button 
className='btn btn-primary' disabled={!email||!password}
onClick={handleSubmit}
style={{
  width: "100%",
  padding: "12px",
  fontSize: "16px"
}}
>
  Login
</button>

<p className='mt-3' >
 Not A user ? <NavLink to='/register'>Register Here</NavLink>
</p>

      </form>
    </div>
    </div>
    
    
    </>
  )
}
export default Login;