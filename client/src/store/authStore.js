import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: JSON.parse(
    sessionStorage.getItem('user') || 
    localStorage.getItem('user') || 
    'null'
  ),

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    sessionStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    set({ user: null });
  }
}));

export default useAuthStore;