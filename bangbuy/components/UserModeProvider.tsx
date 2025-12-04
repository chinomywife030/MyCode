// components/UserModeProvider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// 定義兩種身分：requester (買家/許願者), shopper (代購/接單者)
type UserMode = 'requester' | 'shopper';

interface UserModeContextType {
  mode: UserMode;
  toggleMode: () => void;
  isShopper: boolean;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  // 預設身分為 requester (買家)
  const [mode, setMode] = useState<UserMode>('requester');

  // 切換功能的邏輯
  const toggleMode = () => {
    setMode((prev) => (prev === 'requester' ? 'shopper' : 'requester'));
  };

  // 為了方便其他元件判斷，多傳一個布林值
  const isShopper = mode === 'shopper';

  return (
    <UserModeContext.Provider value={{ mode, toggleMode, isShopper }}>
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