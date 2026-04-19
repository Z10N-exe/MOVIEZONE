const API_URL = 'https://moviezone-api.onrender.com';
import { createContext, useContext, useState } from "react";

const AppContext = createContext();

// ✅ Provider
export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [favorites, setFavorites] = useState([]);

    return (
        <AppContext.Provider value={{ user, setUser, favorites, setFavorites }}>
            {children}
        </AppContext.Provider>
    );
};

// ✅ THIS is what you are missing (causing the error)
export const useAppContext = () => {
    return useContext(AppContext);
};