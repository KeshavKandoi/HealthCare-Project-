import React, { useState ,useEffect} from 'react'
import Layout from '../../components/Layouts/Layout'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { addDoctor } from '../../redux/actions/doctorAction'
import { toast } from 'react-toastify'
import InputForm from '../../components/Forms/InputForm'
import InputSelect from '../../components/Forms/inputSelect'





function AddDoctor() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [image, setImage] = useState(null)
  const [speciality, setSpeciality] = useState("")
  const [experience, setExperience] = useState("")
  const [degree, setDegree] = useState("")
  const [about, setAbout] = useState("")
  const [fees, setFees] = useState("")
  const [address, setAddress] = useState("")
  const [gender, setGender] = useState("")
  const [phone, setPhone] = useState("")

  const dispatch=useDispatch()
  const navigate=useNavigate()

  const handleAddDoctor=()=>{
    if(!name||!email||!about||!speciality||!fees||!experience||!degree||!address||!phone||!image||!gender){
      return toast.error("Please provide all fields")
    }
    const formData=new FormData()
    formData.append('name',name)
    formData.append('email',email)
    formData.append('about',about)
    formData.append('speciality',speciality)
    formData.append('fees',fees)
    formData.append('experience',experience)
    formData.append('degree',degree)
    formData.append('address',address)
    formData.append('gender',gender)
    formData.append('phone',phone)
    formData.append('image',image)

    dispatch(addDoctor(formData));
    if(success){
      toast.success("Doctor Created")
      navigate("/all-doctors")
    }
    if(error){
      toast.error(error)
    }
  }
  const {success,error}=useSelector(state=>state.doctor)
  return (
   <Layout>
      <div className='d-flex p-3 justify-content-between bg-light'>

      <button className='btn btn-primary' onClick={()=>navigate("/all-doctors")}>GO BACK</button>
      
    </div> 
  <div className='w-75'>
    <InputForm label={'Name'} value={name} setValue={setName}></InputForm>
    <InputForm label={'Email'} value={email} setValue={setEmail}></InputForm>
    <InputForm label={'Degree'} value={degree} setValue={setDegree}></InputForm>
    <InputSelect label={'Speciality'} value={speciality}
    setValue={setSpeciality} options={['Select Speciality','General','Dental','Mental','Eye',]}/>
    <InputSelect label={'Gender'} value={gender}
    setValue={setGender} options={['Select Gender','Male','Female',]}/>

    <InputForm label={'Experience'} value={experience} setValue={setExperience}></InputForm>
    <InputForm label={'Fees'} value={fees} setValue={setFees}></InputForm>
    <InputForm label={'About'} value={about} setValue={setAbout}></InputForm>
    <InputForm label={'Phone'} value={phone} setValue={setPhone}></InputForm>
    <InputForm label={'Address'} value={address} setValue={setAddress}></InputForm>
    <div className='mb-3'>
      <label htmlFor='form-label'>Select Image File <br/> <br/></label>
      <input type='file' accept='image/*' onChange={(e)=>setImage(e.target.files[0])} className='form-control'/>
    </div>
    <br/>
    <button className='btn btn-primary' onClick={handleAddDoctor}>ADD NEW DOCTOR</button>

  </div>
   </Layout>
  )
}

export default AddDoctor
