import React, { useEffect } from 'react'
import Layout from '../../components/Layouts/Layout'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { getAllDoctors } from '../../redux/actions/doctorAction'
import { reset } from '../../redux/slice/doctorSlice'
import { Link } from 'react-router-dom'


function AllDoctors() {
  const dispatch=useDispatch()
  const navigate=useNavigate()

  useEffect(()=>{
   dispatch(getAllDoctors())
   dispatch(reset())
  },[dispatch])

  const {doctors}=useSelector(state=>state.doctor)
   
  return (
   <Layout>
    <div className='d-flex p-3 justify-content-between bg-light'>
      <h1>All Doctors LIST</h1>
      <button className='btn btn-primary' onClick={()=>navigate("/add-doctors")}>+ ADD DOCTOR</button>
    </div>
    <div>
      <table className='table'>
        <thead>
          <tr>
            <th>SNO</th>
            <th>IMAGE</th>
            <th>NAME</th>
            <th>SPECIALITY</th>
            <th>FEES</th>
            <th>AVAILABLE</th>
            <th>DETAILS</th>
          </tr>
        </thead>
        <tbody>
          {doctors?.map((d,i)=>(
           <tr key={i+1}>
            <td>{i+1}</td>
            <td>
              <img src={`data:image/jpeg;base64,${d.image}`} alt="docimage" className='bg-info' height={50} width={50}/>
            </td>
            <td>{d?.name}</td>
            <td>{d?.speciality}</td>
            <td>{d?.fees}</td>
            <td>{d?.available?"AVAILABLE":"NOT AVAILABLE"}</td>
            <td>
            <Link to={`/doctor-details/${d?._id}`}>MORE DETAILS</Link>
            </td>
           </tr>
          ))}
        </tbody>
      </table>
    </div>
   </Layout>
  )
}

export default AllDoctors
