import React from 'react'
import { useDispatch } from 'react-redux'
import { cancelStatus, getAllAppointments } from '../../redux/actions/authAction';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import toast from "react-hot-toast";


function MyAppointments() {
  const dispatch = useDispatch()

  useEffect(() => {
    const localData = localStorage.getItem("appData");
    const appData = JSON.parse(localData);
    if (appData) {
      const id = appData?.user?._id;
      dispatch(getAllAppointments(id));
    }
  }, [dispatch])

  const { appointments, error, success } = useSelector((state) => state.auth);

  const handleCancel = (id) => {
    dispatch(cancelStatus(id));
    if (success) {
      toast.success("cancel successfully")
      window.location.reload();
    }
    if (error) {
      toast.error(error);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24 }}>My All Appointments</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="table-ds">
          <thead>
            <tr>
              <th>SNO</th>
              <th>Booking Date</th>
              <th>Booking Time</th>
              <th>Fees</th>
              <th>Status</th>
              <th>Details</th>
              <th>Update Booking</th>
            </tr>
          </thead>
          <tbody>
            {appointments?.length > 0 && appointments?.map((a, i) => (
              <tr key={i + 1}>
                <td>{i + 1}</td>
                <td>{a?.slotDate}</td>
                <td>{a?.slotTime}</td>
                <td>₹{a?.amount}</td>
                <td><span className={`status-pill status-${a?.status}`}>{a?.status}</span></td>
                <td>
                  <Link to={`/user/appointments/${a?._id}`} style={{ color: '#fca5a5', fontWeight: 600 }}>Details</Link>
                </td>
                <td>
                  {a?.status == "pending"
                    ? <button className="btn-ds btn-ds-danger" style={{ padding: '6px 16px', fontSize: 13 }} onClick={() => handleCancel(a?._id)}>Cancel</button>
                    : <span style={{ color: 'rgba(255,255,255,0.4)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MyAppointments
