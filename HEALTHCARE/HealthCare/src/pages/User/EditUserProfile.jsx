import React, { useEffect, useState } from 'react'
import "./User.css"
import { useDispatch } from 'react-redux';
import { useSelector } from "react-redux";
import { getLoginUserDetails, updateUserData } from '../../redux/actions/authAction';
import { reset } from '../../redux/slice/authSlice';
import toast from 'react-hot-toast';

const EditUserProfile = ({ isOpen, onClose }) => {
  const { user, success, error } = useSelector((state) => state.auth);
  const dispatch = useDispatch()
  const [name, setName] = useState(user?.name || "")
  const [gender, setgender] = useState(user?.gender || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [address, setAddress] = useState(user?.address || "")
  const [image, setImage] = useState(null)

  const handleUpdate = () => {
    const formData = new FormData()
    if (image && image instanceof File) {
      formData.append('image', image)
    }
    formData.append('name', name)
    formData.append('phone', phone)
    formData.append('address', address)
    formData.append('gender', gender)
    dispatch(updateUserData({ id: user._id, formData }))
  };

  useEffect(() => {
    if (success) {
      toast.success('user updated!')
      dispatch(getLoginUserDetails(user?._id))
      dispatch(reset())
      onClose();
    }
    if (error) {
      toast.error(error);
    }
  }, [dispatch, success, error, onClose, user])

  if (!isOpen) return null;
  return (
    <div className="modal-overlay-ds" onClick={onClose}>
      <div className="modal-box-ds" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-ds">
          <h5>Edit Your Profile</h5>
          <button type="button" className="modal-close-ds" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body-ds">
          {user?.image
            ? <img src={user.image.startsWith('data:') ? user.image : `data:image/jpeg;base64,${user.image}`} alt="Profile" className="avatar-ds" style={{ marginBottom: 16, alignSelf: 'center' }} />
            : <div className="avatar-ds profile-avatar-fallback" aria-label="Profile avatar" style={{ marginBottom: 16, alignSelf: 'center' }}>{user?.name?.charAt(0)?.toUpperCase() || 'P'}</div>}

          <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Profile Photo</label>
          <input type="file" className="file-input-ds" onChange={(e) => setImage(e.target.files[0])} />

          <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Name</label>
          <input type="text" className="input-ds" name="name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />

          <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Gender</label>
          <select className="input-ds" value={gender} onChange={(e) => setgender(e.target.value)}>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>

          <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Phone</label>
          <input type="tel" className="input-ds" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Address</label>
          <input type="text" className="input-ds" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} style={{ marginBottom: 0 }} />
        </div>

        <div className="modal-footer-ds">
          <button type="button" className="btn-ds btn-ds-secondary" onClick={onClose}>Close</button>
          <button type="button" className="btn-ds btn-ds-primary" onClick={() => handleUpdate(user?._id)}>Save changes</button>
        </div>
      </div>
    </div>
  )
}

export default EditUserProfile
