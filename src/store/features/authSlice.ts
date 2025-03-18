import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types';
import { MembershipStatus } from '@/types/membership.types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  membershipStatus: MembershipStatus;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  membershipStatus: {
    isPending: false,
    isMember: false,
  },
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setAuthStatus: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setMembershipStatus: (state, action: PayloadAction<MembershipStatus>) => {
      state.membershipStatus = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.membershipStatus = {
        isPending: false,
        isMember: false,
      };
    },
  },
});

export const { setUser, setAuthStatus, setMembershipStatus, logout } =
  authSlice.actions;

export default authSlice.reducer;
