import React from 'react'
import Menus from './Menus'
import Footer from './Footer'

function Layout({ children }) {
  return (
    <>
      <div className="row" style={{ minHeight: "100vh" }}>
        <div className="col-md-2">
          <Menus />
        </div>

        <div className="col-md-10 d-flex flex-column">
          {children}

          <div className="mt-auto">
            <Footer />
          </div>
        </div>
      </div>
    </>
  )
}

export default Layout
