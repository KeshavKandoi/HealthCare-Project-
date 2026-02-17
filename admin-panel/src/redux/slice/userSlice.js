import { createSlice } from "@reduxjs/toolkit";
import { getAllUsers, getStats, getUserDetails } from "../actions/userAction";



const userSlice=createSlice({
  name:"user",
  initialState:{
    loading:false,
    success:false,
    user:null,
    users:null,
    error:null,
    appointments:null,
    stats:null
  },
  reducers:{
    reset:(state)=>{
      state.error=null;
      state.success=false;

    },
  },
  extraReducers:(builder) => {
    builder
  // get all user

    .addCase(getAllUsers.pending,(state)=>{
      state.loading=true;
    })
    .addCase(getAllUsers.fulfilled,(state,action)=>{
      state.loading=false;
      state.success=true;
      state.users=action.payload.users;
      
    })
    .addCase(getAllUsers.rejected,(state,action)=>{
    state.loading=false;
    state.error=action.payload
  })
  //get userDeatils

  .addCase(getUserDetails.pending,(state)=>{
    state.loading=true;
  })
  .addCase(getUserDetails.fulfilled,(state,action)=>{
    state.loading=false;
    state.success=true;
    state.user=action.payload.user;
    state.appointments=action.payload.appointments
    
  })
  .addCase(getUserDetails.rejected,(state,action)=>{
  state.loading=false;
  state.error=action.payload
})


// get STATS

.addCase(getStats.pending,(state)=>{
  state.loading=true;
})
.addCase(getStats.fulfilled,(state,action)=>{
  state.loading=false;
  state.success=true;
  state.stats=action.payload.stats;
  
})
.addCase(getStats.rejected,(state,action)=>{
state.loading=false;
state.error=action.payload
})

}
});




export const{ reset }=userSlice.actions 
export default userSlice.reducer