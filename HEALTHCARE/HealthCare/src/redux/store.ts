import {configureStore} from "@reduxjs/toolkit";
import AuthReducer from "./slice/authSlice";
// import UserReducer from "./slice/userSlice"
import DoctorReducer from "./slice/doctorSlice"
import AppointmentsReducer from "./slice/appointmentSlice"

const store=configureStore({
  reducer:{
    auth:AuthReducer,
    // user:UserReducer,
    doctor:DoctorReducer,
    appointment:AppointmentsReducer,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
