import { createSlice } from "@reduxjs/toolkit";
import { getAllAppointments, getAppointmentDetails, updateAppointmentStatus } from "../actions/appointmentAction";




const doctorSlice=createSlice({
  name:"appointment",
  initialState:{
    loading:false,
    success:false,
    appointment:null,
    appointments:null,
    error:null,
  },
  reducers:{
    reset:(state)=>{
      state.error=null;
      state.success=false;

    },
  },
  extraReducers:(builder) => {
    builder

  // get all  appointment

    .addCase(getAllAppointments.pending,(state)=>{
      state.loading=true;
    })
    .addCase(getAllAppointments.fulfilled,(state,action)=>{
      state.loading=false;
      state.success=true;
      state.appointments=action.payload.appointments
      
    })
    .addCase(getAllAppointments.rejected,(state,action)=>{
    state.loading=false;
    state.error=action.payload
  })
  
  // get  appointment details

  .addCase(getAppointmentDetails.pending,(state)=>{
    state.loading=true;
  })
  .addCase(getAppointmentDetails.fulfilled,(state,action)=>{
    state.loading=false;
    state.success=true;
    state.appointment = action.payload.appointmentDetails;
    
  })
  .addCase(getAppointmentDetails.rejected,(state,action)=>{
  state.loading=false;
  state.error=action.payload
})



.addCase(updateAppointmentStatus.pending,(state)=>{
  state.loading=true;
})
.addCase(updateAppointmentStatus.fulfilled,(state)=>{
  state.loading=false;
  state.success=true;
  
})
.addCase(updateAppointmentStatus.rejected,(state,action)=>{
state.loading=false;
state.error=action.payload
})

 



}
});




export const{ reset }=doctorSlice.actions 
export default doctorSlice.reducer