import { configureStore } from '@reduxjs/toolkit';
import clubReducer from './features/clubSlice';
import authReducer from './features/authSlice';

// redux설정1: npm i @reduxjs/toolkit react-redux
// redux설정2: Redux store 설정
export const store = configureStore({
  reducer: {
    // redux설정3.2: 리듀서 설정
    club: clubReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
