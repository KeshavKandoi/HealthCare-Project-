import React from 'react'
import {NavLink, useNavigate} from "react-router-dom"
import toast from "react-hot-toast"
import { useDispatch } from 'react-redux';
import { logout } from '../../redux/slice/authSlice';

function Menus() {
  const navigate =useNavigate();
  const dispatch=useDispatch();
  const handleLogout=()=>{
    dispatch(logout())
    toast.success("Logout Successfully")
    localStorage.removeItem("appData");
    navigate("/")

  }
  return (
    <div className='d-flex flex-column' >

   <ul className='nav d-flex flex-column justify-content-center'   style={{minHeight:"100vh"}}>

  <h4 className='mb-5 text-center'>Admin Panel</h4>

    <li className='nav-item'>
      <NavLink className="nav-link" to={"/home"}>
        Home
      </NavLink>
    </li>
    <li className='nav-item'>
      <NavLink className="nav-link" to={"/all-users"}>
        USERS
      </NavLink>
    </li>
    <li className='nav-item'>
      <NavLink className="nav-link" to={"/all-doctors"}>
       DOCTORS
      </NavLink>
    </li>
    <li className='nav-item'>
      <NavLink className="nav-link" to={"/all-appointments"}>
       APPOINTMENTS
      </NavLink>
    </li>
    <button className='btn btn-danger m-3' onClick={handleLogout}>LOGOUT</button>
   </ul>
    </div>
  )
}

export default Menus
