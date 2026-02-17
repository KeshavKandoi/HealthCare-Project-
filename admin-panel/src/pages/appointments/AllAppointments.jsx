import React, { useEffect } from 'react'
import Layout from '../../components/Layouts/Layout'
import { useDispatch, useSelector } from 'react-redux'

import { getAllAppointments } from '../../redux/actions/appointmentAction'
import { Link } from 'react-router-dom'

function AllAppointments() {

  const dispatch=useDispatch()


  useEffect(()=>{
    dispatch(getAllAppointments())
  },[dispatch])


    const {appointments}=useSelector(state=>state.appointments)

    return (
<Layout>
  <h1>All Appointments</h1>
  <table className='table'>
    <thead>
      <tr>
        <th>SNO</th>
        <th>ID</th>
        <th>DATE</th>
        <th>AMOUNT</th>
        <th>STATUS</th>
        <th>Details/Edit</th>
        
      </tr>
    </thead>
    <tbody>
      {appointments?.map((a,i)=>(
        <tr key={i+1}>
          <td>{i+1}</td>
          <td>{a?.userId?.name}</td>
          <td>{a?.slotDate}</td>
          <td>{a?.slotTime}</td>
          <td>{a?.amount}/-RS</td>
          <td>{a?.status}</td>
          <td>
            <Link to={`/appointment-details/${a._id}`}>MORE DETAILS</Link>
          </td>
        </tr>
      ))}
      </tbody>
  </table>
</Layout>
  )
}

export default AllAppointments
