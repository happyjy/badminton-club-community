import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { ClubWithDetails } from '@/types';

interface ClubState {
  currentClub: ClubWithDetails;
}
export const initialState: ClubState = {
  currentClub: {
    id: 0,
    name: '',
    description: '',
    location: '',
    meetingTime: '',
    maxMembers: 0,
    etc: '',
    members: [],
    createdAt: new Date('1990-01-01'),
    updatedAt: new Date('1990-01-01'),
  },
};

// redux설정3.1: 리듀서 생성
export const clubSlice = createSlice({
  name: 'club',
  initialState,
  reducers: {
    setClubData: (state, action: PayloadAction<ClubWithDetails>) => {
      state.currentClub = action.payload || initialState.currentClub;
    },
  },
});

export const { setClubData } = clubSlice.actions;
export default clubSlice.reducer;
