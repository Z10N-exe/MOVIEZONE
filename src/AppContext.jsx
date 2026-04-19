import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();
const API_URL = 'http://127.0.0.1:5000/api';

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [user, setUser] = React.useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isPremium, setIsPremium] = React.useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved).isPremium : false;
  });
  const [myList, setMyList] = useState([]);
  const [downloads, setDownloads] = useState([]);

  // Sync user's PRO status from backend on load (picks up admin-granted changes)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          const freshUser = res.user;
          setUser(prev => ({ ...prev, ...freshUser }));
          setIsPremium(freshUser.isPremium);
          localStorage.setItem('user', JSON.stringify({ ...JSON.parse(localStorage.getItem('user') || '{}'), ...freshUser }));
        }
      })
      .catch(() => {}); // silent fail if offline
  }, []);

  const addToMyList = (movie) => {
    if (!myList.find(m => m.id === movie.id)) {
      setMyList([...myList, movie]);
    }
  };

  const removeFromMyList = (id) => {
    setMyList(myList.filter(m => m.id !== id));
  };

  const addDownload = (movie) => {
    if (!downloads.find(m => m.id === movie.id)) {
      setDownloads([...downloads, movie]);
    }
  };

  const removeDownload = (id) => {
    setDownloads(downloads.filter(m => m.id !== id));
  };

  const login = (userData, token) => {
    setUser(userData);
    setIsPremium(userData.isPremium);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setIsPremium(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AppContext.Provider value={{
      user, login, logout,
      isPremium, setIsPremium,
      myList, addToMyList, removeFromMyList,
      downloads, addDownload, removeDownload
    }}>
      {children}
    </AppContext.Provider>
  );
};
