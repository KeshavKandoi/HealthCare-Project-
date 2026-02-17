 import React, { useEffect } from 'react'
 import AllDoctorsData from "./Doctors.json"
 import { NavLink } from 'react-router-dom'
 import "./AllDoctors.css"
 import{useDispatch,useSelector} from "react-redux"
 import {getAllDoctors} from "../../redux/actions/doctorAction"

 
const AllDoctors=()=> {

  const dispatch=useDispatch()
  useEffect(()=>{
    dispatch(getAllDoctors())
  },[dispatch])

  const {doctors}=useSelector(state=>state.doctor)

   return (
     <>
           <h4 className='text-center text-success mt-3'>
        Select a Doctor and Your appointment online now!
      </h4>
      <br/>      <br/>      <br/>
     <div className='container doc-container'>
  
   
      {doctors?.map((d)=>(
        <div className='card' key={d._id}style={{width:"15rem"}}>
          <NavLink to={`/doctors/${d._id}`}>
            <img src={`data:image/jpeg;base64,${d?.image}`}
            alt="picture"
            width={150}
            height={150}
            className='card-img-top'
           />
           <div className='card-body'>
            <h6>{d.name}</h6>
            <p>{d.degree}</p>
           </div>
           <div className='card-footer'>
            <p>
              <i className={d.icon}></i> {d.speciality}
            </p>
           </div>
          </NavLink>
        </div>
      ))}
     </div>
     </>
   )
 }
 
 export default AllDoctors
 