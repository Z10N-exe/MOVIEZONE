import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    });
    const [favorites, setFavorites] = useState([]);
    const [myList, setMyList] = useState(() => {
        try { return JSON.parse(localStorage.getItem('myList')) || []; } catch { return []; }
    });
    const [downloads, setDownloads] = useState(() => {
        try { return JSON.parse(localStorage.getItem('downloads')) || []; } catch { return []; }
    });

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

    const addToMyList = (movie) => {
        setMyList(prev => {
            if (prev.find(m => m.id === movie.id)) return prev;
            const updated = [...prev, movie];
            localStorage.setItem('myList', JSON.stringify(updated));
            return updated;
        });
    };

    const removeFromMyList = (id) => {
        setMyList(prev => {
            const updated = prev.filter(m => m.id !== id);
            localStorage.setItem('myList', JSON.stringify(updated));
            return updated;
        });
    };

    const isInMyList = (id) => myList.some(m => m.id === id);

    const addDownload = (item) => {
        setDownloads(prev => {
            if (prev.find(d => d.id === item.id)) return prev;
            const updated = [item, ...prev];
            localStorage.setItem('downloads', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <AppContext.Provider value={{ user, setUser, favorites, setFavorites, login, logout, myList, addToMyList, removeFromMyList, isInMyList, downloads, addDownload }}>
            {children}
        </AppContext.Provider>
    );
};

// ✅ THIS is what you are missing (causing the error)
export const useAppContext = () => {
    return useContext(AppContext);
};