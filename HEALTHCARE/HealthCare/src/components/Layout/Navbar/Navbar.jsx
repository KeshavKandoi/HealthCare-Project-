import React from 'react'
import Topbar from './Topbar'
import NavMenu from './NavMenu'
import { NavLink } from 'react-router-dom'
import logo from "../../../assets/logo.png"

function Navbar() {
  return (
        <>
       
       < div className="navbar-container sticky-top">
        <div className='row'>
          <div className='col-md-3'>
            <NavLink to="/">
           <img src={logo} alt="logo" className='brand-logo'  />
                    </NavLink>
          </div>

          <div className='col-md-9'>
            <div>
              <Topbar/>
            </div>
            <div>
              <NavMenu/>
            </div>
            
          </div>
        </div>
       </div>
      
      </>
  )
}

export default Navbar
