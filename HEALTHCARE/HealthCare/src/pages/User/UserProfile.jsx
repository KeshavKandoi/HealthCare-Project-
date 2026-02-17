import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast';
import { useState } from 'react';
import EditUserProfile from './EditUserProfile';
import { useSelector } from 'react-redux';
import { getLoginUserDetails } from '../../redux/actions/authAction';
import { useDispatch } from 'react-redux'
import { logout } from '../../redux/slice/authSlice';

const UserProfile=()=> {


  const navigate=useNavigate();
  const [isOpen,setIsOpen]=useState(false)
  const dispatch=useDispatch();
  const {user}=useSelector(state=>state.auth)

useEffect(()=>{
  const localData=localStorage.getItem("appData");
  const appData=JSON.parse(localData);
  if(appData){
    const id=appData?.user?._id;
    dispatch(getLoginUserDetails(id))
  }
},[dispatch]);



  const handleLogout=()=>{
    dispatch(logout());
    localStorage.removeItem("appData");
    navigate("/login");
    toast.success("logout successfully")
  }
  
  return (
  <>
  <div className='container mt-5'>
    <div className='row'>
      <h4 className='text-center'>Manage your Account & Appointments</h4>
      <div className='col-md-3'>
      <img
  src={user?.image ? `data:image/jpeg;base64,${user.image}` : null}
  alt="userPic"
  width={200}
/>
      </div>
      <div className='col-md-8 mt-3'>
        <div className='user-container mb-3'>
          <h6>Name:{user?.name}</h6>
          <h6>Gender:{user?.gender||"NA"}</h6>
          {/* <h6>DOB:{user?.dob||"NA"}</h6> */}
          <h6>Email:{user?.email}</h6>
          <h6>Phone:{user?.phone||"NA"}</h6>
          <h6>Address:{user?.address||"NA"}</h6>
          <br/>
          <h4>
  {user?._id && (
    <Link to={`/user/reset-password/${user._id}`}>
      <button>Reset Password</button>
    </Link>
  )}
</h4>

        </div>
        {/* Buttons */}
        <div className='button-container mt-5'>
          <button className='btn btn-warning' onClick={()=>setIsOpen(!isOpen)}>
            <i className='fa-solid fa-pen-to-square'></i>
           Edit Profile
          </button>
    
          <button className='btn btn-primary ms-3' onClick={()=> navigate("/user/appointments")}>
            <i className='fa-solid fa-list'></i>
      Appointments
          </button>
          
          <button className='btn btn-danger ms-3' onClick={handleLogout}>
            <i className='fa-solid fa-power-off'></i>
           LOGOUT
          </button>
        </div>

       
      </div>
    </div>
  </div>
  {/* {edit modal} */}
  {isOpen &&(
  <EditUserProfile isOpen={isOpen} onClose={()=>setIsOpen(false)}/>
)}
  </>
  )
}

export default UserProfile
