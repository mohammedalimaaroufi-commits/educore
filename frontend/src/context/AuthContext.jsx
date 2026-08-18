import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [teacher, setTeacher] = useState(() => {
    const raw = localStorage.getItem('educore_teacher');
    return raw ? JSON.parse(raw) : null;
  });
  const [subscription, setSubscription] = useState(null);
  const [trialInfo, setTrialInfo] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem('educore_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setTeacher(data.teacher);
      setSubscription(data.subscription);
      setTrialInfo(data.trialInfo);
      setSubscriptionInfo(data.subscriptionInfo);
      localStorage.setItem('educore_teacher', JSON.stringify(data.teacher));
    } catch {
      // interceptor handles redirect on 401
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshMe(); }, [refreshMe]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('educore_token', data.token);
    localStorage.setItem('educore_teacher', JSON.stringify(data.teacher));
    setTeacher(data.teacher);
    await refreshMe();
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('educore_token', data.token);
    localStorage.setItem('educore_teacher', JSON.stringify(data.teacher));
    setTeacher(data.teacher);
    await refreshMe();
  };

  const logout = () => {
    localStorage.removeItem('educore_token');
    localStorage.removeItem('educore_teacher');
    setTeacher(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ teacher, subscription, trialInfo, subscriptionInfo, loading, login, register, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
