import React, { useEffect, useState } from 'react'
import Layout from '../../components/Layouts/Layout'
import { useDispatch, useSelector } from 'react-redux';
import { getAppointmentDetails, updateAppointmentStatus} from '../../redux/actions/appointmentAction';
import { useNavigate, useParams } from 'react-router-dom';
import InputSelect from '../../components/Forms/InputSelect'
import toast from 'react-hot-toast';

function AppointmentDetails() {

  const{id}=useParams();
  const dispatch=useDispatch();
  const navigate=useNavigate()
  const [selectedStatus,setAppointmentStatus]=useState("")

  useEffect(()=>{
    dispatch(getAppointmentDetails(id));
  },[dispatch,id]);

  const {appointment}=useSelector((state)=>state.appointments);

  const appointmentStatus = selectedStatus || appointment?.bookingStatus || "";


const handleUpdateStatus=async()=>{
  try {
    await dispatch(updateAppointmentStatus({id,appointmentStatus})).unwrap();
    toast.success("Status Updated");
    navigate("/all-appointments")
  } catch (error) {
    toast.error(typeof error === 'string' ? error : 'Could not update status')
  }
}

  return (
    <Layout>
       <h1>Appointment Details</h1>
       <table className='table'>
        <tbody>
          <tr>
            <th>Client name</th>
            <td>{appointment?.clientName}</td>
          </tr>

      

          <tr>
            <th>Client Email</th>
            <td>{appointment?.clientEmail}</td>
          </tr>
          

          <tr>
            <th>Doctor name</th>
            <td>{appointment?.doctorName}</td>
          </tr>
          

          <tr>
            <th>Doctor Phone</th>
            <td>{appointment?.doctorPhone}</td>
          </tr>
          

          <tr>
            <th>Doctor Email</th>
            <td>{appointment?.doctorEmail}</td>
          </tr>
          



          <tr>
            <th>Booking Date</th>
            <td>{appointment?.bookingDate}</td>
          </tr>

          <tr>
            <th>Booking Time</th>
            <td>{appointment?.bookingTime}</td>
          </tr>


          <tr>
            <th>Booking Amount</th>
            <td>{appointment?.amount}</td>
          </tr>
          
          

          <tr>
            <th>Booking Status</th>
            <td>{appointment?.bookingStatus}</td>
          </tr>
          


          

        </tbody>
       </table>

       <div className='mt-4 w-50'>
        <h4>Update Booking Status</h4>
        <InputSelect value={appointmentStatus} setValue={setAppointmentStatus} options={['pending','completed','cancelled']}/>

        <button className='btn btn-primary' onClick={handleUpdateStatus}>UpdateStatus</button>
       </div>
    </Layout>
  )
}

export default AppointmentDetails
