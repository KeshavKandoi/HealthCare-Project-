import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import { sendWebMessage } from '../../../redux/actions/authAction'

function MessageForm() {

  const [name,setName]=useState ("")
  const [message,setMessage]=useState ("")
  const [contact,setContact]=useState ("")

  const dispatch=useDispatch()
  const {success,error}=useSelector(state=>state.auth);


  const handleMessage=()=>{
if(!name||!contact||!message){
  return toast.error("Please Provide name or contact Message")
}
const msgData={name,contact,message}
dispatch(sendWebMessage(msgData))
if(success){
  toast.success("message sent successfully")
}
if(error){
  toast.error(error)
}
  }




  return (
    <>
  <div className='mform'>

<h1>Send Us Message </h1>
<br/>

<input type='text' placeholder='Enter your name' required={true} value={name} onChange={e=>setName(e.target.value)}/>

<br/>

<input type='text' placeholder='Enter your email' required={true}
value={contact} onChange={e=>setContact(e.target.value)}
/>

<br/>

<textarea placeholder="Enter your Message" name='message' rows={5}
value={message} onChange={e=>setMessage(e.target.value)}

></textarea>

<br/>

<button className='btn' onClick={handleMessage}>Send Message</button>

  </div>
    </>
      
  )
}

export default MessageForm
