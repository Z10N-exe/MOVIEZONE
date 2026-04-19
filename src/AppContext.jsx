import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    });
    const [favorites, setFavorites] = useState([]);

    const login = (userData, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AppContext.Provider value={{ user, setUser, favorites, setFavorites, login, logout }}>
            {children}
        </AppContext.Provider>
    );
};

// ✅ THIS is what you are missing (causing the error)
export const useAppContext = () => {
    return useContext(AppContext);
};