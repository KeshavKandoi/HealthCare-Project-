import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/store';
import './Footer.css';
import { useLanguage } from '../../../i18n/LanguageContext';

export default function Footer() {
  const { user, demo } = useSelector((state: RootState) => state.auth);
  const workspace = Boolean(user);
  const { tr } = useLanguage();

  return <footer className={`site-footer${workspace ? ' site-footer--workspace' : ''}`}>
    <div className="site-footer-inner">
      <div className="site-footer-top">
        <div className="site-footer-brand">
          <Link to="/" className="site-footer-logo" aria-label="Heartline home"><span aria-hidden="true">♥</span> Heartline</Link>
          <p>{tr(workspace ? 'Your health information, appointments, and monitoring in one place.' : 'A simpler way to keep your heart health records together.')}</p>
        </div>
        <nav className="site-footer-links" aria-label="Footer navigation">
          <div><h2>{tr(workspace ? 'Your care' : 'Explore')}</h2>
            <Link to="/">{tr('Home')}</Link>
            <Link to={workspace ? '/my-health' : '/doctors'}>{tr(workspace ? 'Health records' : 'Doctors')}</Link>
            <Link to={workspace ? '/appointments' : '/subscription'}>{tr(workspace ? 'Appointments' : 'Holter plans')}</Link>
          </div>
          <div><h2>{tr(workspace ? 'Support' : 'Heartline')}</h2>
            <Link to={workspace ? '/device-support' : '/about'}>{tr(workspace ? 'Device support' : 'About')}</Link>
            <Link to="/contact">{tr('Contact')}</Link>
            <Link to="/features">Features</Link><Link to="/technology">Technology</Link><Link to="/how-it-works">How It Works</Link>
            {workspace && <Link to='/user/profile'>Account settings</Link>}
          </div>
        </nav>
      </div>
      <div className="site-footer-bottom"><span>© {new Date().getFullYear()} Heartline</span><span>{tr(demo ? 'Demo workspace · sample data' : 'Made for connected care')}</span></div>
    </div>
  </footer>;
}
