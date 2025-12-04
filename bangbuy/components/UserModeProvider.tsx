// components/UserModeProvider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// 定義兩種身分：requester (買家/許願者), shopper (代購/接單者)
type UserMode = 'requester' | 'shopper';

interface UserModeContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  toggleMode: () => void;
  isShopper: boolean;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  // 從 localStorage 讀取或預設為 requester
  const [mode, setModeState] = useState<UserMode>('requester');

  // 初始化時從 localStorage 讀取
  useEffect(() => {
    const saved = localStorage.getItem('bangbuy_mode');
    if (saved === 'requester' || saved === 'shopper') {
      setModeState(saved);
    }
  }, []);

  // 設定模式並存到 localStorage
  const setMode = (newMode: UserMode) => {
    setModeState(newMode);
    localStorage.setItem('bangbuy_mode', newMode);
  };

  // 切換功能的邏輯
  const toggleMode = () => {
    const newMode = mode === 'requester' ? 'shopper' : 'requester';
    setMode(newMode);
  };

  // 為了方便其他元件判斷，多傳一個布林值
  const isShopper = mode === 'shopper';

  return (
    <UserModeContext.Provider value={{ mode, setMode, toggleMode, isShopper }}>
      {children}
    </UserModeContext.Provider>
  );
}

// 這是給其他元件用的 Hook
export function useUserMode() {
  const context = useContext(UserModeContext);
  if (context === undefined) {
    throw new Error('useUserMode must be used within a UserModeProvider');
  }
  return context;
}