
import { useDispatch } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import React, { useState } from 'react'
import { resetPassword } from '../../redux/actions/authAction'
import toast from 'react-hot-toast'
import { logout, reset } from '../../redux/slice/authSlice'







function ResetPassword() {
  const {id}=useParams()
  const navigate=useNavigate()
  const dispatch=useDispatch()

  const [oldPassword,setOldPassword]=useState("")
  const [newPassword,setNewPassword]=useState("")
  const [busy, setBusy] = useState(false)
  

  const handleResetPassword=async()=>{
    if(!oldPassword||!newPassword){
      return toast.error("Please Provide old or new Password")
    }
    setBusy(true)
    try {
      await dispatch(resetPassword({id,oldPassword,newPassword})).unwrap();
      localStorage.removeItem('appData');
      dispatch(logout());
      toast.success('Password changed. Please sign in again.');
      navigate('/login');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Could not change password');
      dispatch(reset());
    } finally {
      setBusy(false);
    }
  };

  return (

    <main className="password-settings-page">
      <section className="password-settings-card">
        <span className="password-settings-kicker">ACCOUNT SECURITY</span>
        <h1>Change your password</h1>
        <p>Enter your current password and choose a new one for your account.</p>
        <form onSubmit={(event) => { event.preventDefault(); handleResetPassword(); }}>
          <label htmlFor="current-password">Current password</label>
          <input id="current-password" type="password" autoComplete="current-password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button type="submit" disabled={busy}>{busy ? 'Updating password…' : 'Update password'}</button>
        </form>
        <button className="password-settings-back" type="button" onClick={() => navigate('/user/profile')}>Back to settings</button>
      </section>
    </main>
  )
}

export default ResetPassword
