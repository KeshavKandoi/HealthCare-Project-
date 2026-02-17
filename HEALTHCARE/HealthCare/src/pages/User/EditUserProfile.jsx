import React, { useEffect, useState } from 'react'
import "./User.css"
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useSelector } from "react-redux";
import { getLoginUserDetails, updateUserData } from '../../redux/actions/authAction';
import { reset } from '../../redux/slice/authSlice';
import toast from 'react-hot-toast';


const EditUserProfile=({isOpen,onClose})=> {

const { user, success, error } = useSelector((state) => state.auth);





  const dispatch=useDispatch()
  const navigate=useNavigate()


  const[name,setName]=useState("")
  const[gender,setgender]=useState("")
  const[phone,setPhone]=useState("")
  const[dob,setDob]=useState("")
  const[address,setAddress]=useState("")
  const[image,setImage]=useState("")



  useEffect(()=>{
    if(user){
      setName(user?.name)
      setPhone(user?.phone||'')
      setgender(user?.gender||'')
      setAddress(user?.address||'')
      setImage(user?.image||'')
    }
  },[user])

  // handle update

  const handleUpdate=()=>{
    const formData=new FormData()
    formData.append('image',image)
    formData.append('name',name)
    formData.append('phone',phone)
    formData.append('address',address)
    formData.append('gender',gender)
    dispatch(updateUserData({id:user._id,formData}))


  };
   useEffect(()=>{
    if(success){
      toast.success('user updated!')
      dispatch(getLoginUserDetails(user?._id))
      dispatch(reset())
      onClose();
    }
    if(error){
      toast.error(error);
    }
   },[dispatch,success,error,onClose,user])


  if(!isOpen)return null;
  return (
   <>
<div className=" editModal modal d-block" tabIndex="-1">
  <div className="modal-dialog">
    <div className="modal-content">
      <div className="modal-header">
        <h5 className="modal-title">Edit Your Profile</h5>
        <button 
        type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"
        onClick={onClose}
        />
      </div>

     <div className='modal-body'>
      <div className='mod-details d-flex flex-column'>
      <img src={`data:image/jpeg;base64,${user?.image}`} alt="userPic" height={80} width={100}/>
      <br/>  

      <input type="file" onChange={(e)=>setImage(e.target.files[0])}/>

      <br/>

      <input type="text" name="name" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)}/>

      <br/>

      <div className='d-flex flex-row'>
      <select className="m-1"value={gender} onChange={(e)=>setgender(e.target.value)}>
   
  <option value="male">Male</option>
  <option value="female">Female</option>

</select>
        {/* <input type="date" placeholder="dob"/> */}
      </div>
      <br/>
      <input type="tel" placeholder="Phone number"value={phone} onChange={(e)=>setPhone(e.target.value)}/>

      <br/>   
      <input type="text" placeholder="address"value={address} onChange={(e)=>setAddress(e.target.value)}/>
     </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal"onClick={onClose}>Close</button>
        <button type="button" className="btn btn-primary" onClick={()=>handleUpdate(user?._id)}>Save changes</button>
      </div>
    </div>
  </div>
</div>

   
   </>
  )
}

export default EditUserProfile
