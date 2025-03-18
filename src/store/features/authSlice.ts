import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, ClubMember } from '@/types';
import { MembershipStatus } from '@/types/membership.types';

interface AuthState {
  user: User | null;
  membershipStatus: MembershipStatus;
  clubMember: ClubMember | null;
}

const initialState: AuthState = {
  user: null,
  membershipStatus: {
    isPending: false,
    isMember: false,
  },
  clubMember: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    setMembershipStatus: (state, action: PayloadAction<MembershipStatus>) => {
      state.membershipStatus = action.payload;
    },
    setClubMember: (state, action: PayloadAction<ClubMember | null>) => {
      state.clubMember = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.membershipStatus = {
        isPending: false,
        isMember: false,
      };
      state.clubMember = null;
    },
  },
});

export const { setUser, setMembershipStatus, setClubMember, logout } =
  authSlice.actions;

export default authSlice.reducer;
