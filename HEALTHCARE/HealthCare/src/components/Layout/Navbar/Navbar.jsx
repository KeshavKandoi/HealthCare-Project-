import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUserData } from '../../../redux/actions/authAction'
import './Navbar.css'

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
]

function applyLanguageCookie(code) {
  document.cookie = `googtrans=/en/${code}; path=/`
  document.cookie = `googtrans=/en/${code}; path=/; domain=${window.location.hostname}`
  window.location.reload()
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState(() => {
    const code = document.cookie.match(/googtrans=\/en\/([a-z]+)/)?.[1]
    return LANGUAGES.find(lang => lang.code === code) || LANGUAGES[0]
  })
  const dispatch = useDispatch()
  useEffect(() => { dispatch(getUserData()) }, [dispatch])
  const { user } = useSelector((state) => state.auth)

  const handleLangSelect = (lang) => {
    setSelectedLang(lang)
    setLangOpen(false)

    applyLanguageCookie(lang.code)
  }

  return (
    <header className="navbar-container">
      <nav className="main-nav" aria-label="Main navigation">
        <NavLink to="/" className="brand-text" onClick={() => setMenuOpen(false)}><span className="brand-pulse" aria-hidden="true">♥</span>Heartline</NavLink>

        <button className="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <i className={menuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"}></i>
        </button>

        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <li><NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink></li>
          <li><NavLink to="/about" onClick={() => setMenuOpen(false)}>About</NavLink></li>
          <li><NavLink to="/doctors" onClick={() => setMenuOpen(false)}>Doctors</NavLink></li>
          <li><NavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact</NavLink></li>

          {user && (
            <>
              <li><span className="nav-divider"></span></li>
              <li><NavLink to="/health-monitor" onClick={() => setMenuOpen(false)}>Health Monitor</NavLink></li>
              <li><NavLink to="/health-history" onClick={() => setMenuOpen(false)}>Health History</NavLink></li>
              <li><NavLink to="/ecg-monitor" onClick={() => setMenuOpen(false)}>ECG Monitor</NavLink></li>
              <li>
                <NavLink to="/subscription" className="sub-link" onClick={() => setMenuOpen(false)}>
                  Subscription
                </NavLink>
              </li>
              <li>
                <NavLink to="/ai-doctor" className="ai-link" onClick={() => setMenuOpen(false)}>
                  AI Doctor
                </NavLink>
              </li>
            </>
          )}

        </ul>
        <div className="nav-actions">
          <div className="lang-wrap">
            <button type="button" className="lang-selector" aria-label="Select language" aria-expanded={langOpen} onClick={() => setLangOpen(!langOpen)}>
              <i className="fa-solid fa-globe" aria-hidden="true"></i>
              <span>{selectedLang.label}</span>
              <i className={`fa-solid fa-chevron-down lang-chevron ${langOpen ? 'open' : ''}`} aria-hidden="true"></i>
            </button>
            {langOpen && (
              <div className="lang-dropdown" role="menu" aria-label="Languages">
                {LANGUAGES.map((lang) => (
                  <button type="button" role="menuitem" key={lang.code} className={`lang-option ${selectedLang.code === lang.code ? 'active' : ''}`} onClick={() => handleLangSelect(lang)}>
                    <span className="lang-native">{lang.native}</span>
                    <span className="lang-label">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <NavLink to={user ? "/user/profile" : "/login"} className="nav-account-btn" aria-label={user ? "Open profile" : "Log in"}>
            <i className="fa-solid fa-circle-user" aria-hidden="true"></i><span>{user?.name?.split(' ')[0] || 'Login'}</span>
          </NavLink>
        </div>
      </nav>
    </header>
  )
}

export default Navbar
