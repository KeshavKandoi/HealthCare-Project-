
import { useDispatch } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import React, { useState } from 'react'
import { resetPassword } from '../../redux/actions/authAction'
import toast from 'react-hot-toast'
import { logout, reset } from '../../redux/slice/authSlice'







function ResetPassword() {
  const {id}=useParams()
  const navigate=useNavigate()
  const dispatch=useDispatch()

  const [oldPassword,setOldPassword]=useState("")
  const [newPassword,setNewPassword]=useState("")
  

  const handleResetPassword=async()=>{
    if(!oldPassword||!newPassword){
      return toast.error("Please Provide old or new Password")
    }
    try {
      await dispatch(resetPassword({id,oldPassword,newPassword})).unwrap();
      localStorage.removeItem('appData');
      dispatch(logout());
      toast.success('Password changed. Please sign in again.');
      navigate('/login');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Could not change password');
      dispatch(reset());
    }
  };

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
