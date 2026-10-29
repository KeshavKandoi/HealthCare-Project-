import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast';
import { useState } from 'react';
import EditUserProfile from './EditUserProfile';
import { useSelector } from 'react-redux';
import { getLoginUserDetails } from '../../redux/actions/authAction';
import { useDispatch } from 'react-redux'
import { logout } from '../../redux/slice/authSlice';
import { leaveDemoSession } from '../../demo/demoSession';
import './User.css';
import API, { endAccountSession } from '../../Api/API';
import { useLanguage } from '../../i18n/LanguageContext';

function ProfileAvatar({ user }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = typeof user?.image === 'string' ? user.image : null;
  const src = image?.startsWith('data:') ? image : image ? `data:image/jpeg;base64,${image}` : null;
  return src && !imageFailed
    ? <img src={src} alt={`${user?.name || 'Patient'} profile`} className="profile-avatar" onError={() => setImageFailed(true)} />
    : <div className="profile-avatar profile-avatar-fallback" aria-label="Profile avatar">{user?.name?.charAt(0)?.toUpperCase() || 'P'}</div>;
}

const UserProfile = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false)
  const dispatch = useDispatch();
  const { user, demo } = useSelector(state => state.auth)
  const { code, setCode, languages, t, tr, locale } = useLanguage();
  const [planRequest, setPlanRequest] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const userId = user?._id;

  useEffect(() => {
    if (demo && user?._id) {
      dispatch(getLoginUserDetails(user._id));
      return;
    }
    try {
      const appData = JSON.parse(localStorage.getItem("appData") || "null");
      if (appData?.user?._id) dispatch(getLoginUserDetails(appData.user._id));
    } catch { /* Session restoration handles malformed data. */ }
  }, [dispatch, demo, user?._id]);

  useEffect(() => {
    if (!userId || demo) return;
    let active = true;
    API.get('/plan-inquiries/mine').then(({ data }) => {
      if (active) setPlanRequest(data.inquiries?.[0] || null);
    }).catch(() => {
      if (active) setPlanRequest(null);
    }).finally(() => { if (active) setPlanLoading(false); });
    return () => { active = false; };
  }, [userId, demo]);

  const handleLogout = async () => {
    await endAccountSession();
    dispatch(logout());
    localStorage.removeItem("appData");
    leaveDemoSession();
    navigate("/login");
    toast.success("logout successfully")
  }

  return (
    <main className="profile-page">
      <div className="profile-shell">
        <div className="profile-heading"><span>YOUR ACCOUNT</span><h1>{tr('Settings')}</h1><p>{tr('Manage your profile, language, and Holter plan requests.')}</p></div>
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
            {user?._id && !demo && <Link to={`/user/reset-password/${user._id}`} className="btn-ds btn-ds-secondary">Reset password</Link>}
            {demo && <span className="profile-kicker">Demo account · no password or stored profile</span>}
            <button type="button" className="btn-ds btn-ds-danger profile-logout" onClick={handleLogout}><i className="fa-solid fa-power-off"></i>Logout</button>
          </div>
        </section>
        <section className="profile-settings-grid" aria-label="Account settings">
          <div className="profile-settings-card"><span className="profile-kicker">{tr('PREFERENCES')}</span><h2>{t('language')}</h2><p>{tr('Choose your preferred language for available interface labels.')}</p><label htmlFor="profile-language">{t('language')}</label><select id="profile-language" value={code} onChange={event => setCode(event.target.value)}>{languages.map(language => <option key={language.code} value={language.code}>{language.name}</option>)}</select><small className="profile-language-note">These five languages are included without an API key. Some clinical pages remain in English until their translations are verified.</small></div>
          <div className="profile-settings-card"><span className="profile-kicker">HOLTER</span><h2>{tr('Plan details')}</h2>{demo ? <p>{tr('Demo mode does not include a purchased plan.')}</p> : planLoading ? <p>Loading your plan request…</p> : planRequest ? <><p><strong>{planRequest.plan_id === 'holter-care' ? 'Holter + care' : 'Holter device'}</strong></p><p>Request status: <strong className="profile-plan-status">{planRequest.status}</strong></p><p>Requested {Number.isFinite(Date.parse(planRequest.created_at)) ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(planRequest.created_at)) : 'Date unavailable'}</p><p>{planRequest.plan_id === 'holter-care' ? 'Proposed first-year package: device, four remote reviews subject to availability, app access, and one year of maintenance and service.' : 'Proposed one-time device purchase: recorder, setup guidance, app pairing, and technical reports. Doctor visits are separate.'}</p><small>A quote request is not a purchase or an active subscription. Final price and terms are confirmed in writing.</small></> : <p>{tr('No Holter plan request yet.')}</p>}<Link to="/subscription">{tr('View Holter plan details →')}</Link></div>
        </section>
      </div>

      {isOpen && (
        <EditUserProfile isOpen={isOpen} onClose={() => setIsOpen(false)} />
      )}
    </main>
  )
}

export default UserProfile
