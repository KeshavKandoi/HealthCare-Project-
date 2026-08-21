import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { getUserData } from '../../../redux/actions/authAction'
import logo from '../../../assets/logo.png'
import './Navbar.css'

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
]

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0])
  const dispatch = useDispatch()
  useEffect(() => { dispatch(getUserData()) }, [dispatch])
  const { user } = useSelector((state) => state.auth)

  // Detect current language from cookie on load
  useEffect(() => {
    const match = document.cookie.match(/googtrans=\/en\/([a-z]+)/)
    if (match) {
      const found = LANGUAGES.find(l => l.code === match[1])
      if (found) setSelectedLang(found)
    }
  }, [])

  const handleLangSelect = (lang) => {
    setSelectedLang(lang)
    setLangOpen(false)

    if (lang.code === 'en') {
      // Clear translation cookies and reload
      document.cookie = 'googtrans=/en/en; path=/'
      document.cookie = `googtrans=/en/en; path=/; domain=${window.location.hostname}`
      window.location.reload()
      return
    }

    // Set cookie and reload — Google Translate reads this cookie automatically
    document.cookie = `googtrans=/en/${lang.code}; path=/`
    document.cookie = `googtrans=/en/${lang.code}; path=/; domain=${window.location.hostname}`
    window.location.reload()
  }

  return (
    <div className="navbar-container">

      {/* TOPBAR */}
      <div className="topbar-container">
        <div className="lang-selector" onClick={() => setLangOpen(!langOpen)}>
          <i className="fa-solid fa-globe"></i>
          <span>{selectedLang.native}</span>
          <i className={`fa-solid fa-chevron-down lang-chevron ${langOpen ? 'open' : ''}`}></i>

          {langOpen && (
            <div className="lang-dropdown">
              {LANGUAGES.map((lang) => (
                <div
                  key={lang.code}
                  className={`lang-option ${selectedLang.code === lang.code ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleLangSelect(lang) }}
                >
                  <span className="lang-native">{lang.native}</span>
                  <span className="lang-label">{lang.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAIN NAV */}
      <div className="main-nav">
        <NavLink to="/" className="brand-text"></NavLink>

        <button className="nav-toggle" onClick={() => setMenuOpen(!menuOpen)}>
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

          <li><span className="nav-divider"></span></li>

          {user ? (
            <li>
              <NavLink to="/user/profile" className="nav-account-btn" onClick={() => setMenuOpen(false)}>
                <i className="fa-solid fa-circle-user"></i> {user.name?.split(' ')[0] || 'My Account'}
              </NavLink>
            </li>
          ) : (
            <li>
              <NavLink to="/login" className="nav-account-btn" onClick={() => setMenuOpen(false)}>
                Login
              </NavLink>
            </li>
          )}
        </ul>
      </div>

    </div>
  )
}

export default Navbar
