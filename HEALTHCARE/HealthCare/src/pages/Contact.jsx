import React from 'react'
import ContactMessage from "../components/Static/ContactMessage/ContactMessage"

import Topbar from "../components/Layout/Navbar/Topbar"

function Contact() {
  return (
   <>
   
   <div className='d-flex mt-5 justify-content-center'>
   &nbsp;
      <h6><i className="fa-solid fa-phone-volume ms-3">&nbsp;</i>Emergency Call:&nbsp;08043420100</h6> &nbsp; &nbsp;
      <br/>   
      <h6> <i className="fa-solid fa-clock ms-3">&nbsp;</i>&nbsp;10:00am &nbsp;To&nbsp; 10:00pm </h6> &nbsp; &nbsp; &nbsp;
      <h6> &nbsp;<i className="fa-solid fa-envelope ms-3">&nbsp;</i>help@kandoi.com</h6> &nbsp; &nbsp;
    
    </div>

    <ContactMessage/>
   </>

  )
}

export default Contact
