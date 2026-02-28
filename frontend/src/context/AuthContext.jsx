import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('hn_user');
        const token = localStorage.getItem('hn_token');
        if (stored && token) {
            setUser(JSON.parse(stored));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const { data } = await API.post('/auth/login', { email, password });
        localStorage.setItem('hn_token', data.token);
        localStorage.setItem('hn_user', JSON.stringify(data.user));
        setUser(data.user);
        return data;
    };

    const register = async (payload) => {
        const { data } = await API.post('/auth/register', payload);
        localStorage.setItem('hn_token', data.token);
        localStorage.setItem('hn_user', JSON.stringify(data.user));
        setUser(data.user);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('hn_token');
        localStorage.removeItem('hn_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
