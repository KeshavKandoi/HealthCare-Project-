
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { resetPassword } from '../../redux/actions/authAction'
import toast from 'react-hot-toast'
import { logout, reset } from '../../redux/slice/authSlice'







function ResetPassword() {
  const {id}=useParams()
  const navigate=useNavigate()
  const dispatch=useDispatch()

  const [oldPassword,setOldPassword]=useState("")
  const [newPassword,setNewPassword]=useState("")
  

  const {success,error}=useSelector(state=>state.auth)

  const handleResetPassword=()=>{
    if(!oldPassword||!newPassword){
      return toast.error("Please Provide old or new Password")
    }
    dispatch(resetPassword({id,oldPassword,newPassword}))
    
    if(error){
      toast.error(error)
      dispatch(reset())
    }
    if(success){
      toast.success("Your Passowrd Reset Please Login Again")

      navigate("/login")
     
      dispatch(logout())
     
      dispatch(reset())

    }
  };

  useEffect(()=>{
  
  },[dispatch,success,navigate,error])

  return (

    <div className='d-flex flex-column align-items-center justify-content-center'
      style={{minHeight:"80vh"}}>

        <h1>
        Reset Your Password
        </h1>
      
    <div className='mb-3'>

      <label htmlFor="" className="me-3"  >Enter Your Old Password</label>

      <input 
      type="password"
      value={oldPassword}
      onChange={(e)=>setOldPassword(e.target.value)}
      className="from-control"
      />
    </div>

    <div className='mb-3'>
      <label htmlFor="" className="me-3" >Enter Your New Password</label>
      <input 
      type="password"
      value={newPassword}
      onChange={(e)=>setNewPassword(e.target.value)}
      className="from-control"
      />
    </div>
    <button className='btn btn-primary' onClick={handleResetPassword}>RESET PASSWORD</button>
    </div>
  )
}

export default ResetPassword
