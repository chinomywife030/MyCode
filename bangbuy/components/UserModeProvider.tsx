'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type UserMode = 'requester' | 'shopper'; // requester=刊登者, shopper=留學生

type UserModeContextType = {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  toggleMode: () => void;
};

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<UserMode>('requester'); // 預設為刊登者

  // 1. 初始化：去讀取瀏覽器紀錄，看上次選什麼
  useEffect(() => {
    const savedMode = localStorage.getItem('bangbuy_mode') as UserMode;
    if (savedMode) {
      setModeState(savedMode);
    }
  }, []);

  // 2. 切換模式的函式
  const setMode = (newMode: UserMode) => {
    setModeState(newMode);
    localStorage.setItem('bangbuy_mode', newMode); // 存到瀏覽器
  };

  const toggleMode = () => {
    const newMode = mode === 'requester' ? 'shopper' : 'requester';
    setMode(newMode);
  };

  return (
    <UserModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  const context = useContext(UserModeContext);
  if (!context) throw new Error('useUserMode must be used within a UserModeProvider');
  return context;
}