import React from 'react'
import { useDispatch } from 'react-redux'
import { cancelStatus, getAllAppointments } from '../../redux/actions/authAction';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import toast from "react-hot-toast";
import { reset } from "../../redux/slice/authSlice";




function MyAppointments() {


  const dispatch=useDispatch()

  useEffect(()=>{
    const localData=localStorage.getItem("appData");
    const appData=JSON.parse(localData);
    if(appData){
     const id=appData?.user?._id;
     dispatch(getAllAppointments(id));
    }
   
     },[dispatch])
   
    const {appointments,error,success} =useSelector((state)=>state.auth);


    const handleCancel=(id)=>{
      dispatch(cancelStatus(id));
      if(success){
        toast.success("cancel successfully")
        window.location.reload();
      }
      if(error){
        toast.error(error);
      }
    };
   

  return (
  <>
  <h1>My All Appointments</h1>
  <table className='table'>
    <thead>
      <tr>
        <th>SNO</th>
        <th>Booking Date</th>
        <th>Booking Time </th>
        <th>Fees</th>
        <th>Status</th>
        <th>Details</th>
        <th>Update Booking</th>
      </tr>
    </thead>
    <tbody>
      {appointments?.length>0 && appointments?.map((a,i)=>(
        <tr key={i+1}>
          <td>{i+1}</td>
          <td>{a?.slotDate}</td>
          <td>{a?.slotTime}</td>
          <td>{a?.amount}</td>
          <td>{a?.status}</td>
          <td>
            <Link to ={`/user/appointments/${a?._id}`}>Details</Link>
          </td>
          <td>
            {a?.status=="pending"?<button className='btn btn-danger' onClick={()=>handleCancel(a?._id)}>Cancel</button>:"NA"}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
  </>
  )
}

export default MyAppointments
