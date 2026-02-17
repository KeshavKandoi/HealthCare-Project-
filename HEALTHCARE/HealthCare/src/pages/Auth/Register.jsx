import React,{useEffect, useState} from 'react'
import "./Auth.css"
import {NavLink, useNavigate} from "react-router-dom"
import toast from "react-hot-toast"
import { useSelector,useDispatch} from 'react-redux'
import { register } from '../../redux/actions/authAction'
import { reset } from '../../redux/slice/authSlice'


const Register=()=> {
  
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");


  const dispatch=useDispatch();
  const navigate=useNavigate();

  const {error,success}=useSelector(state=>state.auth)


  const handleSubmit=(e)=>{
    e.preventDefault();
    if(!name||!email||!password){
      return toast.error("Please provide all fields");
    }
    dispatch(register({name,email,password}))

  }

  useEffect(()=>{
    if(success){
      toast.success("Register successfully");
      navigate("/login");
      setName("");
      setEmail("");
      setPassword("");
      navigate('/login')
      dispatch(reset())
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
      <h2>Create a account</h2>
      <p>Please enter your details to register</p>
      
      <form>

      <div className='form-group mb-3'>
   <input 
    type="text"
    placeholder='Enter your name'
    value={name}
    onChange={(e)=>setName(e.target.value)}/>
      </div>


   
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
className='btn btn-primary' disabled={!name||!email||!password}
onClick={handleSubmit}
style={{
  width: "100%",
  padding: "12px",
  fontSize: "16px"
}}
>
  REGISTER
</button>

<p className='mt-3' >
  Already A user ? <NavLink to='/login'>Login Here</NavLink>
</p>

      </form>
    </div>
    </div>
    
    
    </>
  )
}

export default Register
