import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast';
import { useState } from 'react';
import EditUserProfile from './EditUserProfile';
import { useSelector } from 'react-redux';
import { getLoginUserDetails } from '../../redux/actions/authAction';
import { useDispatch } from 'react-redux'
import { logout } from '../../redux/slice/authSlice';
import './User.css';

function ProfileAvatar({ user }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = user?.image;
  const src = image?.startsWith('data:') ? image : image ? `data:image/jpeg;base64,${image}` : null;
  return src && !imageFailed
    ? <img src={src} alt={`${user?.name || 'Patient'} profile`} className="profile-avatar" onError={() => setImageFailed(true)} />
    : <div className="profile-avatar profile-avatar-fallback" aria-label="Profile avatar">{user?.name?.charAt(0)?.toUpperCase() || 'P'}</div>;
}

const UserProfile = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false)
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth)

  useEffect(() => {
    const localData = localStorage.getItem("appData");
    const appData = JSON.parse(localData);
    if (appData) {
      const id = appData?.user?._id;
      dispatch(getLoginUserDetails(id))
    }
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("appData");
    navigate("/login");
    toast.success("logout successfully")
  }

  return (
    <main className="profile-page">
      <div className="profile-shell">
        <div className="profile-heading"><span>YOUR ACCOUNT</span><h1>Profile & appointments</h1><p>Manage your details and care in one place.</p></div>
        <section className="profile-card" aria-label="Your profile">
          <div className="profile-identity">
            <ProfileAvatar key={user?.image || 'no-image'} user={user} />
            <div><span className="profile-kicker">PATIENT PROFILE</span><h2>{user?.name || 'Patient'}</h2><p>{user?.email || 'No email available'}</p></div>
          </div>

          <div className="profile-details">
            <div><span>Full name</span><strong>{user?.name || 'Not provided'}</strong></div>
            <div><span>Email address</span><strong>{user?.email || 'Not provided'}</strong></div>
            <div><span>Phone number</span><strong>{user?.phone || 'Not provided'}</strong></div>
            <div><span>Gender</span><strong>{user?.gender || 'Not provided'}</strong></div>
            <div className="profile-address"><span>Address</span><strong>{user?.address || 'Not provided'}</strong></div>
          </div>

          <div className="profile-actions">
            <button type="button" className="btn-ds btn-ds-light" onClick={() => setIsOpen(true)}><i className="fa-solid fa-pen-to-square"></i>Edit profile</button>
            <button type="button" className="btn-ds btn-ds-secondary" onClick={() => navigate('/user/appointments')}><i className="fa-solid fa-list"></i>Appointments</button>
            {user?._id && <Link to={`/user/reset-password/${user._id}`} className="btn-ds btn-ds-secondary">Reset password</Link>}
            <button type="button" className="btn-ds btn-ds-danger profile-logout" onClick={handleLogout}><i className="fa-solid fa-power-off"></i>Logout</button>
          </div>
        </section>
      </div>

      {isOpen && (
        <EditUserProfile isOpen={isOpen} onClose={() => setIsOpen(false)} />
      )}
    </main>
  )
}

export default UserProfile
