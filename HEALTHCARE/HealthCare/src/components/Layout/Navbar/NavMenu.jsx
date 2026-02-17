import React, { useEffect, useState } from "react";
import { useSelector ,useDispatch} from "react-redux";
import { NavLink } from "react-router-dom";
import {getUserData} from "../../../redux/actions/authAction"


function NavMenu() {
  const dispatch=useDispatch();
  useEffect(()=>{
    dispatch(getUserData())
  },[dispatch])
const{user}=useSelector((state)=>state.auth);
  return (
    <>
      <nav className="navbar navbar-expand-lg ">
        <div className="container-fluid">

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarSupportedContent"
            aria-controls="navbarSupportedContent"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">

              <li className="nav-item">
                <NavLink
                  to="/"
                  className="nav-link active"
                  aria-current="page"
                >
                  Home
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink to="/about" className="nav-link">
                  About
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink to="/doctors" className="nav-link">
                  Doctors
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink to="/gallery" className="nav-link">
                  Gallery
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink to="/contact" className="nav-link">
                  Contact
                </NavLink>
              </li>
              
        

            </ul>

            <form className="d-flex" role="search">
              <button className="btn btn-outline-success" type="button">
                Book A Appointment
              </button>
            </form>
            {/* login user */}
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
              {user ?(

              <li className="nav-item">
              <NavLink to="/user/profile" className="nav-link">
                My Account
              </NavLink>
            </li>
              ):(
                <li className="nav-item">
                <NavLink to="/login" className="nav-link">
                 LOGIN
                </NavLink>
                </li>

              )}
            </ul>



          </div>
        </div>
      </nav>
    </>
  );
}

export default NavMenu;
