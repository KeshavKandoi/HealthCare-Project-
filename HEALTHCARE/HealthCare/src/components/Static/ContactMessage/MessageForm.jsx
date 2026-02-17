import React from 'react'

function MessageForm() {
  return (
    <>
  <div className='mform'>

<h1>Send Us Message </h1>
<br/>

<input type='text' placeholder='Enter your name' required={true}/>

<br/>

<input type='email' placeholder='Enter your email' required={true}/>

<br/>

<textarea placeholder="Enter your Message" name='message' rows={5}></textarea>

<br/>

<button className='btn'>Send Message</button>

  </div>
    </>
      
  )
}

export default MessageForm
