import React, { useEffect } from 'react'
import Layout from '../../components/Layouts/Layout'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { getUserDetails } from '../../redux/actions/userAction'

const UserDetails=()=> {
  const{id}=useParams();
  const dispatch=useDispatch();

  useEffect(()=>{
    dispatch(getUserDetails(id))
  },[dispatch,id]);

  const { user,appointments }=useSelector((state)=>state.user);
  return (
    <Layout>
    <div className="row d-flex align-items-center bg-light mt-3 p-3">
      <h3 className='text-center'>User Details</h3>
      
      <div className='col-md-4'>
        <img src={`data:image/jpeg;base64,${user?.image}`} alt='userimage' height={200} width={200} className='rounded-1 bg-info'/>
      </div>
      <div className='col-md-8'>
        <h4>NAME:{user?.name}</h4>
        <h4>EMAIL:{user?.email}</h4>
        <h4>PHONE:{user?.phone||"NA"}</h4>
        <h4>ADDRESS:{user?.address||"NA"}</h4>
      </div>

      <h2>ALL APPOINTMENTS</h2>
      <table className='table mt-2'>
        <thead>
          <tr>
            <th>SN</th>
            <th>DATE</th>
            <th>TIME</th>
            <th>DOCTOR Name</th>
            <th>FEES</th>
            <th>STATUS</th>
            <th>PAYMENT</th>
          </tr>
        </thead>
        <tbody>
          {appointments?.map((a,i)=>(
            <tr key={i+1}>
              <td>{i+1}</td>
              <td>{a?.slotDate}</td>
              <td>{a?.slotTime}</td>
              <td>{a?.doctorId?.name}</td>
              <td>{a?.amount}</td>
              <td>{a?.status }</td>
              <td>{a?.payment?"ONLNE" :"CASH"}</td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>

    </Layout>
  ) 
}

export default UserDetails
