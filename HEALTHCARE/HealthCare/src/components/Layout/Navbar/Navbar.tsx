import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../../redux/slice/authSlice';
import { leaveDemoSession } from '../../../demo/demoSession';
import type { RootState } from '../../../redux/store';
import { useLanguage, type LanguageKey } from '../../../i18n/LanguageContext';
import { endAccountSession } from '../../../Api/API';
import './Navbar.css';

const publicLinks = [['/', 'Product'], ['/about', 'How it works'], ['/doctors', 'Doctors'], ['/contact', 'Contact'], ['/subscription', 'Holter plans']];
const patientLinks: [string, LanguageKey, string][] = [['/', 'overview', 'fa-house'], ['/ecg-monitor', 'monitor', 'fa-heart-pulse'], ['/my-health', 'health', 'fa-notes-medical'], ['/appointments', 'appointments', 'fa-calendar-check'], ['/devices', 'devices', 'fa-microchip'], ['/care-plans', 'plans', 'fa-clipboard-list'], ['/caregivers', 'family', 'fa-people-roof'], ['/device-support', 'support', 'fa-screwdriver-wrench']];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, demo } = useSelector((state: RootState) => state.auth);
  const { t, tr, code, setCode, languages } = useLanguage();
  const languageSelector = <select className="language-selector" aria-label={t('language')} value={code} onChange={event => setCode(event.target.value)} dir="auto">{languages.map(language => <option key={language.code} value={language.code}>{language.name}</option>)}</select>;
  const close = () => setOpen(false);
  const signOut = async () => {
    await endAccountSession();
    localStorage.removeItem('appData');
    leaveDemoSession();
    dispatch(logout());
    close();
    navigate('/');
  };

  if (user) return <>
    <header className="app-topbar"><button className="app-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}><i className={open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'} /></button><NavLink to="/" className="app-logo" onClick={close}>♥ <span>Heartline</span></NavLink><span className="app-topbar-label">{demo ? tr('Demo workspace') : tr('Patient workspace')}</span>{languageSelector}<NavLink to="/user/profile" className="app-avatar" aria-label="Account settings">{user.name?.slice(0, 1)?.toUpperCase() || 'P'}</NavLink></header>
    <aside className={`app-sidebar ${open ? 'is-open' : ''}`} aria-label="Patient navigation"><div className="app-sidebar-inner"><p>{demo ? 'DEMO WORKSPACE' : 'WORKSPACE'}</p><nav>{patientLinks.map(([path, label, icon]) => <NavLink key={path} to={path} end={path === '/'} onClick={close}><i className={`fa-solid ${icon}`} aria-hidden="true" />{t(label)}</NavLink>)}<NavLink to="/doctors" onClick={close}><i className="fa-solid fa-user-doctor" aria-hidden="true" />{tr('Doctor directory')}</NavLink><NavLink to="/ai-doctor" onClick={close}><i className="fa-solid fa-comment-medical" aria-hidden="true" />Heartline Companion</NavLink><NavLink to="/bp-alerts" onClick={close}><i className="fa-solid fa-bell" aria-hidden="true" />{tr('BP alerts')}</NavLink><NavLink to="/ecg-history" onClick={close}><i className="fa-solid fa-wave-square" aria-hidden="true" />{t('recordings')}</NavLink>{demo&&<><NavLink to="/clinician" onClick={close}><i className="fa-solid fa-calendar" aria-hidden="true" />{tr('Clinician schedule')}</NavLink></>}<NavLink to="/subscription" onClick={close}><i className="fa-solid fa-heart-pulse" aria-hidden="true" />{tr('Holter plans')}</NavLink></nav><div className="app-sidebar-bottom"><NavLink to="/user/profile" onClick={close}><i className="fa-solid fa-gear" />{t('settings')}</NavLink><button onClick={signOut}><i className="fa-solid fa-right-from-bracket" />{demo ? t('exitDemo') : tr('Sign out')}</button></div></div></aside>
    {open && <button className="app-overlay" onClick={close} aria-label="Close navigation" />}
  </>;

  return <header className="public-header"><nav className="public-nav" aria-label="Main navigation"><NavLink to="/" className="app-logo" onClick={close}>♥ <span>Heartline</span></NavLink><button className="app-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}><i className={open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'} /></button><div className={`public-links ${open ? 'is-open' : ''}`}>{publicLinks.map(([path, label]) => <NavLink key={path} to={path} onClick={close}>{tr(label)}</NavLink>)}<NavLink to="/login" onClick={close}>{tr('Sign in')}</NavLink><NavLink to="/register" className="public-cta hl-button" onClick={close}>{tr('Get started')}</NavLink>{languageSelector}</div></nav></header>;
}
