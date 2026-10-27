

import './App.css'
import './glassTheme.css'
import './ui/motion.css'
import { Routes, Route, useLocation, useParams, Navigate } from "react-router-dom";
import Home from "./pages/Home"
import Navbar from "./components/Layout/Navbar/Navbar";
import Footer from './components/Layout/Footer/Footer';
import {Toaster} from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { Component, lazy, Suspense, useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { RootState, AppDispatch } from './redux/store';
import { logout, startDemo } from './redux/slice/authSlice';
import { getLoginUserDetails } from './redux/actions/authAction';
import { isDemoSession } from './demo/demoSession';
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Register = lazy(() => import('./pages/Auth/Register'));
const Login = lazy(() => import('./pages/Auth/Login'));
const AllDoctors = lazy(() => import('./pages/Doctors/AllDoctors'));
const HospitalDoctor = lazy(() => import('./pages/Doctors/HospitalDoctor'));
const Appointments = lazy(() => import('./pages/Doctors/Appointments'));
const UserProfile = lazy(() => import('./pages/User/UserProfile'));
const MyAppointments = lazy(() => import('./pages/User/MyAppointments'));
const AppointmentsDetails = lazy(() => import('./pages/User/AppointmentsDetails'));
const ResetPassword = lazy(() => import('./pages/User/ResetPassword'));
const HealthMonitor = lazy(() => import('./pages/HealthMonitor'));
const HealthHistory = lazy(() => import('./pages/HealthHistory'));
const AiDoctor = lazy(() => import('./pages/AiDoctor'));
const Subscription = lazy(() => import('./pages/Subscription'));
const ECGDashboard = lazy(() => import('./pages/ECGDashboard'));
const ECGDevices = lazy(() => import('./pages/ECGDevices'));
const ECGHistory = lazy(() => import('./pages/ECGHistory'));
const MyHealth = lazy(() => import('./pages/MyHealth'));
const BloodPressureAlerts = lazy(() => import('./pages/BloodPressureAlerts'));
const CareCommunications = lazy(() => import('./pages/CareCommunications'));
const patientAppointments = () => import('./pages/PatientAppointments');
const AppointmentHome = lazy(() => patientAppointments().then(module => ({ default: module.AppointmentHome })));
const DoctorDirectory = lazy(() => patientAppointments().then(module => ({ default: module.DoctorDirectory })));
const BookVisit = lazy(() => patientAppointments().then(module => ({ default: module.BookVisit })));
const DoctorWorkspace = lazy(() => patientAppointments().then(module => ({ default: module.DoctorWorkspace })));
const careOperations = () => import('./pages/CareOperations');
const MonitoringPlans = lazy(() => careOperations().then(module => ({ default: module.MonitoringPlans })));
const FamilyAccess = lazy(() => careOperations().then(module => ({ default: module.FamilyAccess })));
const DeviceSupport = lazy(() => careOperations().then(module => ({ default: module.DeviceSupport })));
const ClinicianECG = lazy(() => careOperations().then(module => ({ default: module.ClinicianECG })));

class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="session-loading"><div><h1>Page could not load</h1><p>The application may have updated while this tab was open.</p><button onClick={() => window.location.reload()}>Reload page</button></div></main> : this.props.children; }
}

function DoctorBookingRoute({ demo }: { demo: boolean }) {
  const { id } = useParams();
  return demo && id ? <Navigate to={`/appointments/book/${id}`} replace /> : <Appointments />;
}

function App() {
  const dispatch=useDispatch<AppDispatch>()
  const { pathname } = useLocation()
  const { user, demo } = useSelector((state: RootState) => state.auth)
  const [restoring, setRestoring] = useState(true)
  const protectedPage = (element: ReactElement) => restoring ? <main className="session-loading" role="status">Checking your session…</main> : user ? element : <Navigate to="/login" replace />

  useEffect(() => {
    let appData: {token?: string; refreshToken?: string; user?: {_id?: string}} | null;
    try { appData = JSON.parse(localStorage.getItem('appData') || 'null'); }
    catch { localStorage.removeItem('appData'); dispatch(logout()); queueMicrotask(() => setRestoring(false)); return; }
    if (!appData?.token || !appData?.refreshToken || !appData?.user?._id) {
      if (isDemoSession()) dispatch(startDemo());
      queueMicrotask(() => setRestoring(false));
      return;
    }
    dispatch(getLoginUserDetails(appData.user._id)).unwrap().catch(() => {
      localStorage.removeItem('appData');
      dispatch(logout());
    }).finally(() => setRestoring(false));
  }, [dispatch]);

  return (
    <>
    <Navbar/>
    <Toaster/>
     <PageErrorBoundary key={pathname}><Suspense fallback={<main className="session-loading" role="status">Loading page…</main>}>
     <Routes>
      <Route path="/" element={restoring ? <main className="session-loading" role="status">Checking your session…</main> : <Home/>}/>
      <Route path="/about" element={<About/>}/>
      <Route path="/contact" element={<Contact/>}/>
      <Route path="/register" element={<Register/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/doctors" element={<AllDoctors/>}/>
      <Route path="/doctors/hospital/:id" element={<HospitalDoctor />} />
      <Route path="/doctors/:id" element={<DoctorBookingRoute demo={demo} />}/>
      <Route path="/user/profile" element={protectedPage(<UserProfile/>)} />
      <Route path="/user/appointments" element={protectedPage(demo ? <Navigate to="/appointments" replace /> : <MyAppointments/>)} />
      <Route path="/user/appointments/:id" element={protectedPage(demo ? <Navigate to="/appointments" replace /> : <AppointmentsDetails/>)} />
      <Route path="/user/reset-password/:id" element={protectedPage(demo ? <Navigate to="/user/profile" replace /> : <ResetPassword/>)} />
      <Route path="/health-monitor" element={protectedPage(demo ? <MyHealth /> : <HealthMonitor />)} />
      <Route path="/health-history" element={protectedPage(<HealthHistory />)} />
      <Route path="/my-health" element={protectedPage(<MyHealth />)} />
      <Route path="/appointments" element={protectedPage(<AppointmentHome />)} />
      <Route path="/appointments/doctors" element={<DoctorDirectory />} />
      <Route path="/appointments/book/:doctorId" element={protectedPage(<BookVisit />)} />
      <Route path="/clinician" element={protectedPage(<DoctorWorkspace />)} />
      <Route path="/clinician/ecg" element={protectedPage(<ClinicianECG />)} />
      <Route path="/care-plans" element={protectedPage(<MonitoringPlans />)} />
      <Route path="/caregivers" element={protectedPage(<FamilyAccess />)} />
      <Route path="/family-access" element={<Navigate to="/caregivers" replace />} />
      <Route path="/bp-alerts" element={protectedPage(<BloodPressureAlerts />)} />
      <Route path="/care-conversations" element={protectedPage(<CareCommunications />)} />
      <Route path="/device-support" element={protectedPage(<DeviceSupport />)} />
      <Route path="/ai-doctor" element={protectedPage(<AiDoctor />)} />
      <Route path="/subscription" element={<Subscription />} />
      <Route path="/ecg-monitor" element={protectedPage(<ECGDashboard />)} />
      <Route path="/devices" element={protectedPage(<ECGDevices />)} />
      <Route path="/ecg-history" element={protectedPage(<ECGHistory />)} />
      <Route path="/ecg-history/:sessionId" element={protectedPage(<ECGHistory />)} />








      
      
      </Routes>
      </Suspense></PageErrorBoundary>
      {!user && pathname === "/" && <Footer/>}
    </>
  )
}

export default App
