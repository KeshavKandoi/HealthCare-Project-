import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
// import DoctorData from "./Doctors.json"
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"
import{setHours,setMinutes} from "date-fns"
import{useDispatch,useSelector} from "react-redux"
import { getDoctorDetails } from '../../redux/actions/doctorAction';
import { bookAppointment } from '../../redux/actions/authAction';
import toast from "react-hot-toast"
import { reset } from "../../redux/slice/authSlice"


const Appointments=()=> {
  const { id }=useParams();
  const [docInfo,setDocInfo]=useState(null);
  const [SelectDateTime,setSelectDateTime]=useState(new Date())
  const dispatch=useDispatch()
  const navigate=useNavigate()

  useEffect(()=>{
    dispatch(getDoctorDetails(id))
    
  },[dispatch,id])
  
  const { doctor } = useSelector((state) => state.doctor);


  useEffect(()=>{
    if(doctor){
    setDocInfo(doctor)
    }

  },[doctor]);

  // get date and time

  const extractDate=(dateObj)=>{
    const day=String(dateObj.getDate()).padStart(2,'0')
    const month=String(dateObj.getMonth()+1).padStart(2,'0')
    const year=dateObj.getFullYear()
    return `${day}-${month}-${year}`
  }

  const extractTime=(ObjectTime)=>{
    let hours=ObjectTime.getHours();
    const minutes=ObjectTime.getMinutes();
    const second=ObjectTime.getSeconds();
    const ampm=hours>=12?"PM":"AM";
    hours=hours%12;
    hours=hours? hours:12;
    return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,"0")}:${String(second).padStart(2,"0")}${ampm}`;


  };



const {success,error,user}=useSelector(state=>state.auth)
const handleBooking=()=>{
  const bookingData={
    userId:user?._id,
    doctorId:id,
    amount:docInfo?.fees,
    slotDate:extractDate(SelectDateTime),
    slotTime:extractTime(SelectDateTime)
  }
 
  
  dispatch(bookAppointment(bookingData))
  if(success){
    toast.success("Booking Successful")
    navigate('/user/appointments')
    dispatch(reset())
  }
  if(error){
    toast.error(error)
    dispatch(reset())
  }
}

  return (
<>
<div className='container docinfo-container'>
  <div className='row m-3'>
    <div className='col-md-3 d-flex flex-column justify-content-center align-items-center'>
    <img src={`data:image/jpeg;base64,${docInfo?.image}`} alt="docImage" height={200} width={200}/>
      <h6>{docInfo?.name}</h6>
      <h6 className={`${docInfo?.available? "text-success":"text-danger"}`}>
        {docInfo?.available?"Available":"Not Available"}
      </h6>
      </div>
 
 <div className='col-md-8 d-flex flex-column justify-content-center m=3'>
  <h6>Experience:{docInfo?.experience}</h6>
  <h6>About Doctor:</h6>
  <p>{docInfo?.about}</p>
  <h5>Consultation Fee:{docInfo?.fees}</h5>

  {/* date time */}

<div className='date-time mt-3'>
  <h6 className=''>Select your Booking Date & Time:↓</h6>
  <br />
  <DatePicker
  className='calender'
  minDate={new Date()}
  selected={SelectDateTime}
  onChange={(date)=>setSelectDateTime(date)}
  showTimeSelect
  timeFormat='h:mm aa'
  timeIntervals={30}
  dateFormat="d-MMMM-yyyy h:mm aa"
  timeCaption='Time'
  minTime={setHours(setMinutes(new Date(), 0), 9)}
  maxTime={setHours(setMinutes(new Date(), 0), 22)}/>

  <p>
     Your Selected Booking:
    &nbsp;{SelectDateTime ?  SelectDateTime.toLocaleString()
     :"Please select a date & time"}

  </p>

</div>



  <button className='btn btn-primary w-50'
  disabled={!docInfo?.available} onClick={handleBooking}>
    {docInfo?.available?"Book Now":"Doctor Not Available"}
  </button>
 </div>
 </div>
</div>

</>
  )
}

export default Appointments


// npm i react-datepicker
// npm i date-fns