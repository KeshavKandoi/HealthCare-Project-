import { createSlice } from "@reduxjs/toolkit";
import { addDoctor, deleteDoctor, getAllDoctors, getDoctorDetails, updateDoctor, updateStatus } from "../actions/doctorAction";




const doctorSlice=createSlice({
  name:"doctor",
  initialState:{
    loading:false,
    success:false,
    doctors:null,
    doctor:null,
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
  // get all doctor

    .addCase(getAllDoctors.pending,(state)=>{
      state.loading=true;
    })
    .addCase(getAllDoctors.fulfilled,(state,action)=>{
      state.loading=false;
      state.success=true;
      state.doctors=action.payload.doctors;
      
    })
    .addCase(getAllDoctors.rejected,(state,action)=>{
    state.loading=false;
    state.error=action.payload
  })
  //get doctor details

  .addCase(getDoctorDetails.pending,(state)=>{
    state.loading=true;
  })
  .addCase(getDoctorDetails.fulfilled,(state,action)=>{
    state.loading=false;
    state.success=true;
    state.user=action.payload.user;
    state.doctor=action.payload.doctor
    
  })
  .addCase(getDoctorDetails.rejected,(state,action)=>{
  state.loading=false;
  state.error=action.payload
})

 //add new doctor

 .addCase(addDoctor.pending,(state)=>{
  state.loading=true;
})
.addCase(addDoctor.fulfilled,(state,action)=>{
  state.loading=false;
  state.success=true;
  state.doctor=action.payload.doctor
  
})
.addCase(addDoctor.rejected,(state,action)=>{
state.loading=false;
state.error=action.payload
})

 //update doctor

 .addCase(updateDoctor.pending,(state)=>{
  state.loading=true;
})
.addCase(updateDoctor.fulfilled,(state)=>{
  state.loading=false;
  state.success=true;

  
})
.addCase(updateDoctor.rejected,(state,action)=>{
state.loading=false;
state.error=action.payload
})


 //delete doctor

 .addCase(deleteDoctor.pending,(state)=>{
  state.loading=true;
})
.addCase(deleteDoctor.fulfilled,(state)=>{
  state.loading=false;
  state.success=true;

  
})
.addCase(deleteDoctor.rejected,(state,action)=>{
state.loading=false;
state.error=action.payload
})

// update status

.addCase(updateStatus.pending,(state)=>{
  state.loading=true;
})
.addCase(updateStatus.fulfilled,(state)=>{
  state.loading=false;
  state.success=true;

  
})
.addCase(updateStatus.rejected,(state,action)=>{
state.loading=false;
state.error=action.payload
})




}
});




export const{ reset }=doctorSlice.actions 
export default doctorSlice.reducer