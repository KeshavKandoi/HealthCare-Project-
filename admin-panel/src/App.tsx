import { lazy, Suspense, useEffect, useState, type ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './redux/store';
import { restoreSession } from './redux/actions/authAction';
import 'react-toastify/dist/ReactToastify.css';

const Login = lazy(() => import('./pages/user/Login'));
const Home = lazy(() => import('./pages/Home'));
const Allusers = lazy(() => import('./pages/user/Allusers'));
const AllDoctors = lazy(() => import('./pages/doctors/AllDoctors'));
const DoctorDetails = lazy(() => import('./pages/doctors/DoctorDetails'));
const AllAppointments = lazy(() => import('./pages/appointments/AllAppointments'));
const AppointmentDetails = lazy(() => import('./pages/appointments/AppointmentDetails'));
const UserDetails = lazy(() => import('./pages/user/UserDetails'));
const AddDoctor = lazy(() => import('./pages/doctors/AddDoctor'));
const Fleet = lazy(() => import('./pages/devices/Fleet'));

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    dispatch(restoreSession()).finally(() => setRestoring(false));
  }, [dispatch]);

  const protectedPage = (page: ReactElement) => restoring
    ? <main role="status">Checking administrator session…</main>
    : user?.isAdmin ? page : <Navigate to="/" replace />;

  return <>
    <Toaster />
    <Suspense fallback={<main role="status">Loading page…</main>}>
      <Routes>
        <Route path="/" element={restoring ? <main role="status">Checking administrator session…</main> : user?.isAdmin ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/home" element={protectedPage(<Home />)} />
        <Route path="/all-users" element={protectedPage(<Allusers />)} />
        <Route path="/user-details/:id" element={protectedPage(<UserDetails />)} />
        <Route path="/all-doctors" element={protectedPage(<AllDoctors />)} />
        <Route path="/add-doctors" element={protectedPage(<AddDoctor />)} />
        <Route path="/doctor-details/:id" element={protectedPage(<DoctorDetails />)} />
        <Route path="/all-appointments" element={protectedPage(<AllAppointments />)} />
        <Route path="/device-fleet" element={protectedPage(<Fleet />)} />
        <Route path="/appointment-details/:id" element={protectedPage(<AppointmentDetails />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </>;
}
