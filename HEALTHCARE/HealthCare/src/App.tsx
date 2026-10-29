

import './App.css'
import './glassTheme.css'
import './ui/motion.css'
import './pages/PublicWebsite.css'
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
import Companion, { OpenCompanion } from './components/Companion/Companion';
import HighBpAlert from './components/Alerts/HighBpAlert';
// Pages with their own focus where the floating Companion would only get in the way.
const withoutCompanion = ['/backoffice', '/login', '/register', '/forgot-password'];
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const PublicContact = lazy(() => import('./pages/PublicContact'));
const PublicInformation = lazy(() => import('./pages/PublicInformation'));
const Register = lazy(() => import('./pages/Auth/Register'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
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
const Subscription = lazy(() => import('./pages/Subscription'));
const ECGDashboard = lazy(() => import('./pages/ECGDashboard'));
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
const Backoffice = lazy(() => import('./pages/Backoffice/Backoffice'));

class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="session-loading"><div className="session-loading-card page-error-card" role="alert"><h1>Page could not load</h1><p>There was a problem opening this page. Please reload and try again.</p><button onClick={() => window.location.reload()}>Reload page</button></div></main> : this.props.children; }
}

function PageLoading({ session = false }: { session?: boolean }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 10000);
    return () => window.clearTimeout(timer);
  }, []);
  return <main className="session-loading" aria-busy="true">
    <div className="session-loading-card" role="status" aria-live="polite">
      <span className="session-loading-icon" aria-hidden="true">♥</span>
      <span className="session-loading-eyebrow">HEARTLINE</span>
      <h1>{session ? 'Preparing your workspace' : 'Getting things ready'}</h1>
      <p>{session ? 'Checking your session securely. This should only take a moment.' : 'Loading your page. This should only take a moment.'}</p>
      <span className="session-loading-spinner" aria-hidden="true" />
      {slow && <div className="session-loading-slow"><p>This is taking longer than expected. Check your connection and try again.</p><button onClick={() => window.location.reload()}>Reload page</button></div>}
    </div>
  </main>;
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
  const [restoreError, setRestoreError] = useState(false)
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const protectedPage = (element: ReactElement) => restoring ? <PageLoading session /> : restoreError ? <main className="session-loading"><div className="session-loading-card" role="alert"><h1>Unable to connect</h1><p>We couldn't check your session. Please check your connection and try again.</p><button onClick={() => { setRestoreError(false); setRestoring(true); setRestoreAttempt(value => value + 1); }}>Try again</button></div></main> : user ? element : <Navigate to="/login" replace />

  useEffect(() => {
    let appData: {token?: string; refreshToken?: string; user?: {_id?: string}} | null;
    try { appData = JSON.parse(localStorage.getItem('appData') || 'null'); }
    catch { localStorage.removeItem('appData'); dispatch(logout()); queueMicrotask(() => setRestoring(false)); return; }
    if (!appData?.token || !appData?.refreshToken || !appData?.user?._id) {
      if (isDemoSession()) dispatch(startDemo());
      queueMicrotask(() => setRestoring(false));
      return;
    }
    let active = true;
    dispatch(getLoginUserDetails(appData.user._id)).unwrap().catch((error: unknown) => {
      if (!active) return;
      const message = typeof error === 'string' ? error : '';
      if (!localStorage.getItem('appData') || /authentication required|invalid token|session expired|unauthorized/i.test(message)) {
        localStorage.removeItem('appData');
        dispatch(logout());
      } else setRestoreError(true);
    }).finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, [dispatch, restoreAttempt]);

  return (
    <>
    {/* The backoffice has its own console header and no patient navigation. */}
    {!pathname.startsWith('/backoffice') && <Navbar/>}
    <Toaster/>
     <PageErrorBoundary key={pathname}><Suspense fallback={<PageLoading />}>
     <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/about" element={user ? <About/> : <PublicInformation kind="about" />}/>
      <Route path="/features" element={<PublicInformation kind="features" />}/>
      <Route path="/how-it-works" element={<PublicInformation kind="how-it-works" />}/>
      <Route path="/technology" element={<PublicInformation kind="technology" />}/>
      <Route path="/contact" element={user ? <Contact/> : <PublicContact/>}/>
      <Route path="/register" element={<Register/>}/>
      <Route path="/forgot-password" element={<ForgotPassword/>}/>
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
      <Route path="/ai-doctor" element={<OpenCompanion />} />
      <Route path="/subscription" element={<Subscription />} />
      <Route path="/ecg-monitor" element={protectedPage(<ECGDashboard />)} />
      <Route path="/devices" element={<Navigate to="/ecg-monitor" replace />} />
      <Route path="/ecg-history" element={protectedPage(<ECGHistory />)} />
      <Route path="/ecg-history/:sessionId" element={protectedPage(<ECGHistory />)} />
      <Route path="/backoffice" element={<Backoffice />} />








      
      
      </Routes>
      </Suspense></PageErrorBoundary>
      {!withoutCompanion.some(path => pathname.startsWith(path)) && <Companion userId={user?._id ?? null} />}
      {user && !pathname.startsWith('/backoffice') && pathname !== '/bp-alerts' && <HighBpAlert />}
      {!user && ["/", "/features", "/how-it-works", "/technology", "/about", "/contact", "/doctors", "/subscription"].includes(pathname) && <Footer/>}
    </>
  )
}

export default App
