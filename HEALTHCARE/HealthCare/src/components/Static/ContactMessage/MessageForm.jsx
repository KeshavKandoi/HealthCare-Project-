import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import { sendWebMessage } from '../../../redux/actions/authAction'

function MessageForm() {
  const [name, setName]       = useState("")
  const [contact, setContact] = useState("")
  const [message, setMessage] = useState("")
  const dispatch = useDispatch()
  const { success, error } = useSelector(state => state.auth)

  const handleMessage = () => {
    if (!name || !contact || !message) {
      return toast.error("Please fill in all fields")
    }
    dispatch(sendWebMessage({ name, contact, message }))
    if (success) toast.success("Message sent successfully")
    if (error)   toast.error(error)
  }

  const inputStyle = {
    width: "100%",
    background: "#0a0a0a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    padding: "14px 18px",
    color: "#fff",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
    display: "block",
    fontFamily: "inherit"
  }

  return (
    <div style={{
      background: "#0a0a0a",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "24px",
      padding: "44px 40px",
    }}>
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#fff", margin: "0 0 8px" }}>Send Us a Message</h2>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", margin: 0 }}>We'll get back to you within 24 hours</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Your Name</label>
          <input
            type="text"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = "rgba(239,68,68,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Phone / Email</label>
          <input
            type="text"
            placeholder="e.g. +91 98765 43210"
            value={contact}
            onChange={e => setContact(e.target.value)}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = "rgba(239,68,68,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Message</label>
          <textarea
            placeholder="Tell us how we can help you..."
            rows={5}
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{ ...inputStyle, resize: "vertical", minHeight: "130px" }}
            onFocus={e => e.target.style.borderColor = "rgba(239,68,68,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />
        </div>

        <button
          onClick={handleMessage}
          style={{
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "16px",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
            width: "100%",
            marginTop: "8px",
            transition: "all 0.3s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px"
          }}
          onMouseOver={e => e.currentTarget.style.background = "#dc2626"}
          onMouseOut={e => e.currentTarget.style.background = "#ef4444"}
        >
          <i className="fa-solid fa-paper-plane"></i>
          Send Message
        </button>
      </div>
    </div>
  )
}

export default MessageForm
