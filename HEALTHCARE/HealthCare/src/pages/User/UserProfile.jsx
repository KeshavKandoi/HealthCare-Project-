import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast';
import { useState } from 'react';
import EditUserProfile from './EditUserProfile';
import { useSelector } from 'react-redux';
import { getLoginUserDetails } from '../../redux/actions/authAction';
import { useDispatch } from 'react-redux'
import { logout } from '../../redux/slice/authSlice';

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
    <div style={{ padding: '50px 40px', maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 30 }}>Manage your Account & Appointments</h2>

      <div className="card-ds" style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <img
          src={user?.image ? `data:image/jpeg;base64,${user.image}` : undefined}
          alt="userPic"
          className="avatar-ds"
          style={{ width: 140, height: 140 }}
        />

        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 20 }}>
            <p><strong>Name:</strong> {user?.name}</p>
            <p><strong>Gender:</strong> {user?.gender || "NA"}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Phone:</strong> {user?.phone || "NA"}</p>
            <p style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {user?.address || "NA"}</p>
          </div>

          {user?._id && (
            <Link to={`/user/reset-password/${user._id}`}>
              <button className="btn-ds btn-ds-secondary" style={{ marginBottom: 24 }}>Reset Password</button>
            </Link>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn-ds btn-ds-light" onClick={() => setIsOpen(!isOpen)}>
              <i className="fa-solid fa-pen-to-square"></i> Edit Profile
            </button>
            <button className="btn-ds btn-ds-secondary" onClick={() => navigate("/user/appointments")}>
              <i className="fa-solid fa-list"></i> Appointments
            </button>
            <button className="btn-ds btn-ds-danger" onClick={handleLogout}>
              <i className="fa-solid fa-power-off"></i> Logout
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <EditUserProfile isOpen={isOpen} onClose={() => setIsOpen(false)} />
      )}
    </div>
  )
}

export default UserProfile
