import React from 'react'
import LocationMap from './LocationMap'
import MessageForm from './MessageForm'

const ContactMessage = () => {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "0",
      maxWidth: "1200px",
      margin: "60px auto",
      padding: "0 40px",
      alignItems: "start"
    }}>
      <LocationMap />
      <MessageForm />
    </div>
  )
}

export default ContactMessage
