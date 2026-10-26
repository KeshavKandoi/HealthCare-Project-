import type {PatientAccount} from '../../types/domain';
interface AuthState {loading:boolean;success:boolean;user:PatientAccount|null;appointments:unknown[]|null;token:string|null;error:string|null;demo:boolean}
import { createSlice } from "@reduxjs/toolkit";
import { loadToken, login,getUserData, register, getLoginUserDetails, updateUserData, getAllAppointments, cancelStatus, resetPassword, bookAppointment, sendWebMessage } from "../actions/authAction";


const authSlice=createSlice({
  name:"auth",
  initialState:{
    loading:false,
    success:false,
    user:null,
    appointments:null,
    token:null,
    error:null,
    demo:false,
  } as AuthState,
  reducers:{
    startDemo:(state)=>{
      state.demo=true;
      state.user={_id:'demo-patient',name:'Demo Patient',email:'demo@example.invalid'};
      state.token=null;
      state.appointments=null;
      state.error=null;
      state.success=false;
    },
    reset:(state)=>{
      state.error=null;
      state.success=false;
      
     

    },
    logout:(state)=>{
      state.user=null;
      state.token=null;
      state.demo=false;
       state.loading = false;
       state.success = false;
       state.error = null;
    },
  },
  extraReducers:(builder) => {
    builder
    // login
    .addCase(login.pending,(state)=>{
      state.loading=true;
    })
    .addCase(login.fulfilled,(state,action)=>{
      state.loading=false;
      state.success=true;
      state.demo=false;
      state.user=action.payload.user;
      state.token=action.payload.token;
    })
    .addCase(login.rejected,(state,action)=>{
    state.loading=false;
    state.error=String(action.payload || "Request failed")
  })
 


// register

   .addCase(register.pending,(state)=>{
    state.loading=true;
  })
  .addCase(register.fulfilled,(state)=>{
    state.loading=false;
    state.success=true;
 
  })
  .addCase(register.rejected,(state,action)=>{
  state.loading=false;
  state.error=String(action.payload || "Request failed")
})


// get login user data

.addCase(getLoginUserDetails.pending,(state)=>{
  state.loading=true;
})
.addCase(getLoginUserDetails.fulfilled,(state,action)=>{
  state.loading=false;
  state.user=action.payload.user;

})
.addCase(getLoginUserDetails.rejected,(state,action)=>{
state.loading=false;
state.error=String(action.payload || "Request failed")
})



// update user

.addCase(updateUserData.pending,(state)=>{
  state.loading=true;
})
.addCase(updateUserData.fulfilled,(state,action)=>{
  state.loading=false;
  state.success=true;
  state.user=action.payload.user;

})
.addCase(updateUserData.rejected,(state,action)=>{
state.loading=false;
state.error=String(action.payload || "Request failed")
})



// ALL APPOINTMENTS

.addCase(getAllAppointments.pending,(state)=>{
  state.loading=true;
})
.addCase(getAllAppointments.fulfilled,(state,action)=>{
  state.loading=false;
  state.success=true;
  state.appointments=action.payload.appointment;

})
.addCase(getAllAppointments.rejected,(state,action)=>{
state.loading=false;
state.error=String(action.payload || "Request failed")
})




// CANCEL APPOINTMENTS

.addCase(cancelStatus.pending,(state)=>{
  state.loading=true;
})
.addCase(cancelStatus.fulfilled,(state)=>{
  state.loading=false;
  state.success=true;


})
.addCase(cancelStatus.rejected,(state,action)=>{
state.loading=false;
state.error=String(action.payload || "Request failed")
})



// reset passoword

.addCase(resetPassword.pending,(state)=>{
  state.loading=true;
})
.addCase(resetPassword.fulfilled,(state)=>{
  state.loading=false;
  state.success=true;
 
})
.addCase(resetPassword.rejected,(state,action)=>{
state.loading=false;
state.error=String(action.payload || "Request failed")
})

// Booking appointment

.addCase(bookAppointment.pending,(state)=>{
  state.loading=true;
})
.addCase(bookAppointment.fulfilled,(state)=>{
  state.loading=false;
  state.success=true;

})
.addCase(bookAppointment.rejected,(state,action)=>{
state.loading=false;
state.error=String(action.payload || "Request failed")
})



// send web message action

.addCase(sendWebMessage.pending,(state)=>{
  state.loading=true;
})
.addCase(sendWebMessage.fulfilled,(state)=>{
  state.loading=false;
  state.success=true;

})
.addCase(sendWebMessage.rejected,(state,action)=>{
state.loading=false;
state.error=String(action.payload || "Request failed")
})




// loadtoken

.addCase(loadToken.fulfilled,(state,action)=>{
  state.token=action.payload;
})
// getuser

.addCase(getUserData.fulfilled,(state,action)=>{
  state.user=action.payload
})

  }
});

export const{ reset ,logout,startDemo }=authSlice.actions 
export default authSlice.reducer
