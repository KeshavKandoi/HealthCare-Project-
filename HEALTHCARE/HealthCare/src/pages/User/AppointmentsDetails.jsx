import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getAppointmentDetails } from "../../redux/actions/appointmentAction";
import toast from "react-hot-toast";

function AppointmentsDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();

  const { appointment, loading, error } = useSelector(
    (state) => state.appointment
  );

  useEffect(() => {
    if (id) {
      dispatch(getAppointmentDetails(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  if (loading) return <h3 className="text-center mt-5">Loading...</h3>;

  return (
    <div className="container mt-5">
      <h2 className="mb-4">Appointment Details</h2>

      <div className="card p-4 shadow">
        <h5>Status: {appointment?.bookingStatus}</h5>

        <p><strong>Booking Date:</strong> {appointment?.bookingDate}</p>
        <p><strong>Booking Time:</strong> {appointment?.bookingTime}</p>
        <p><strong>Fees:</strong> ₹{appointment?.amount}</p>

        <hr />

        <h5>Doctor Details</h5>
        <p><strong>Name:</strong> {appointment?.doctorName}</p>
        <p><strong>Email:</strong> {appointment?.doctorEmail}</p>
        <p><strong>Phone:</strong> {appointment?.doctorPhone}</p>

        <hr />

        <h5>Client Details</h5>
        <p><strong>Name:</strong> {appointment?.clientName}</p>
        <p><strong>Email:</strong> {appointment?.clientEmail}</p>
        <p><strong>Phone:</strong> {appointment?.clientPhone}</p>
      </div>
    </div>
  );
}

export default AppointmentsDetails;
