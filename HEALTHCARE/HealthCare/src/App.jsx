

import './App.css'
import { Routes, Route } from "react-router-dom";
import About from "./pages/About"
import Home from "./pages/Home"
import Contact from "./pages/Contact"
import Navbar from "./components/Layout/Navbar/Navbar";
import Footer from './components/Layout/Footer/Footer';
import GalleryPage from './pages/Gallery/GalleryPage';
import Register from './pages/Auth/Register';
import {Toaster} from 'react-hot-toast';
import Login from "./pages/Auth/Login";
import AllDoctors from "./pages/Doctors/AllDoctors"
import Appointments from './pages/Doctors/Appointments';
import UserProfile from "./pages/User/UserProfile";
import MyAppointments from './pages/User/MyAppointments';
import { useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { reset } from './redux/slice/authSlice';
import { getLoginUserDetails } from './redux/actions/authAction';
import AppointmentsDetails from './pages/User/AppointmentsDetails';
import ResetPassword from './pages/User/ResetPassword';



function App() {
  const dispatch=useDispatch()

  useEffect(()=>{
 dispatch(reset());
 const localData=localStorage.getItem("appData");
 const appData=JSON.parse(localData);
 if(appData){
  const id=appData?.user?._id;
  dispatch(getLoginUserDetails(id));
 }

  },[dispatch])


  return (
    <>
    <Navbar/>
    <Toaster/>
     <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/about" element={<About/>}/>
      <Route path="/contact" element={<Contact/>}/>
      <Route path="/gallery" element={<GalleryPage/>}/>
      <Route path="/register" element={<Register/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/doctors" element={<AllDoctors/>}/>
      <Route path="/doctors/:id" element={<Appointments/>}/>
      <Route path="/user/profile" element={<UserProfile/>}/>
      <Route path="/user/appointments" element={<MyAppointments/>}/>
      <Route path="/user/appointments/:id" element={<AppointmentsDetails/>}/>
      <Route path="/user/reset-password/:id" element={<ResetPassword/>}/>



      
      
      </Routes>
      <Footer/>
    </>
  )
}

export default App
