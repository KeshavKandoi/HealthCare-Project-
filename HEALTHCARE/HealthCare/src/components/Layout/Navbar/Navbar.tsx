import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  const [expanded, setExpanded] = useState(false);
  const [more, setMore] = useState(false);
  const { pathname } = useLocation();
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
    <header className="app-topbar"><button className="app-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}><i className={open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'} /></button><NavLink to="/" className="app-logo" onClick={close}>♥ <span>Heartline</span></NavLink><span className="app-topbar-label">{pathname === '/' ? 'Overview' : pathname.split('/').filter(Boolean).pop()?.replaceAll('-', ' ')}</span>{languageSelector}<NavLink to="/user/profile" className="app-avatar" aria-label="Account settings">{user.name?.slice(0, 1)?.toUpperCase() || 'P'}</NavLink></header>
    <aside className={`app-sidebar aurora-rail ${open ? 'is-open' : ''} ${expanded ? 'is-expanded' : ''}`} aria-label="Patient navigation"><div className="app-sidebar-inner">
      <button className="rail-expand" onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'} aria-expanded={expanded}><i className="fa-solid fa-bars" aria-hidden="true"/><span>Navigation</span></button>
      <nav>{patientLinks.filter(([path]) => ['/', '/ecg-monitor', '/my-health', '/appointments', '/care-plans', '/devices'].includes(path)).map(([path, label, icon]) => <NavLink key={path} to={path} end={path === '/'} onClick={close} title={t(label)} aria-label={t(label)}><i className={`fa-solid ${icon}`} aria-hidden="true"/><span>{t(label)}</span></NavLink>)}<NavLink to="/care-conversations" onClick={close} title="Messages" aria-label="Messages"><i className="fa-solid fa-comments" aria-hidden="true"/><span>Messages</span></NavLink>
      <button className={more ? 'rail-more active' : 'rail-more'} onClick={() => { setMore(!more); setExpanded(true); }} aria-expanded={more} aria-label="More sections" title="More sections"><i className="fa-solid fa-ellipsis" aria-hidden="true"/><span>More</span></button>
      {more && <div className="rail-secondary">{[['/ecg-history','ECG recordings'],['/health-history','Health history'],['/caregivers','Caregivers'],['/bp-alerts','BP alerts'],['/doctors','Doctor directory'],['/clinician/ecg','Clinician ECG'],['/clinician','Clinician schedule'],['/subscription','Holter plans'],['/ai-doctor','Assistant preview']].map(([path,label])=><NavLink key={path} to={path} onClick={close}>{label}</NavLink>)}</div>}</nav>
      <div className="app-sidebar-bottom"><NavLink to="/device-support" title="Help" aria-label="Help" onClick={close}><i className="fa-solid fa-circle-question" aria-hidden="true"/><span>Help</span></NavLink><NavLink to="/user/profile" title="Settings" aria-label="Settings" onClick={close}><i className="fa-solid fa-gear" aria-hidden="true"/><span>{t('settings')}</span></NavLink><button onClick={signOut} title="Sign out" aria-label={demo ? t('exitDemo') : tr('Sign out')}><i className="fa-solid fa-right-from-bracket" aria-hidden="true"/><span>{demo ? t('exitDemo') : tr('Sign out')}</span></button></div></div></aside>
    <nav className="aurora-mobile-nav" aria-label="Mobile navigation">{[['/','Overview','fa-house'],['/ecg-monitor','Monitor','fa-heart-pulse'],['/my-health','Health','fa-notes-medical'],['/appointments','Visits','fa-calendar-check']].map(([path,label,icon])=><NavLink key={path} to={path} end={path === '/'}><i className={`fa-solid ${icon}`} aria-hidden="true"/><span>{label}</span></NavLink>)}<button onClick={()=>setOpen(!open)} aria-expanded={open} aria-label="More navigation"><i className="fa-solid fa-ellipsis" aria-hidden="true"/><span>More</span></button></nav>
    {open && <button className="app-overlay" onClick={close} aria-label="Close navigation" />}
  </>;

  return <header className="public-header"><nav className="public-nav" aria-label="Main navigation"><NavLink to="/" className="app-logo" onClick={close}>♥ <span>Heartline</span></NavLink><button className="app-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}><i className={open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'} /></button><div className={`public-links ${open ? 'is-open' : ''}`}>{publicLinks.map(([path, label]) => <NavLink key={path} to={path} onClick={close}>{tr(label)}</NavLink>)}<NavLink to="/login" onClick={close}>{tr('Sign in')}</NavLink><NavLink to="/register" className="public-cta hl-button" onClick={close}>{tr('Get started')}</NavLink>{languageSelector}</div></nav></header>;
}
