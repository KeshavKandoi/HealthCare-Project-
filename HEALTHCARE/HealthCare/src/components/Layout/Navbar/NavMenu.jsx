import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { NavLink } from "react-router-dom";
import { getUserData } from "../../../redux/actions/authAction";

function NavMenu() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getUserData());
  }, [dispatch]);

  const { user } = useSelector((state) => state.auth);

  return (
    <nav className="navbar navbar-expand-lg bg-light">
      <div className="container-fluid">

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">

            <li className="nav-item">
              <NavLink to="/" className="nav-link">Home</NavLink>
            </li>

            <li className="nav-item">
              <NavLink to="/about" className="nav-link">About</NavLink>
            </li>

            <li className="nav-item">
              <NavLink to="/doctors" className="nav-link">Doctors</NavLink>
            </li>

            <li className="nav-item">
              <NavLink to="/gallery" className="nav-link">Gallery</NavLink>
            </li>

            <li className="nav-item">
              <NavLink to="/contact" className="nav-link">Contact</NavLink>
            </li>

            {user && (
              <>
                <li className="nav-item">
                  <NavLink to="/health-monitor" className="nav-link">
                    Health Monitor
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink to="/health-history" className="nav-link">
                    Health History
                  </NavLink>
                </li>

                {/* 🔥 AI DOCTOR LINK */}
                <li className="nav-item">
                  <NavLink to="/ai-doctor" className="nav-link">
                    🤖 AI Doctor
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          <ul className="navbar-nav ms-auto">
            {user ? (
              <li className="nav-item">
                <NavLink to="/user/profile" className="nav-link">
                  My Account
                </NavLink>
              </li>
            ) : (
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
  );
}

export default NavMenu;
