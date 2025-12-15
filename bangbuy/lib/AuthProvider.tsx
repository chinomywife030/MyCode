/**
 * 🔐 統一的使用者狀態管理
 * 
 * 目的：
 * 1. 提供單一真實來源的使用者狀態
 * 2. 避免不同頁面各自判斷登入狀態
 * 3. 確保狀態未確認前不執行需要使用者的操作
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/errorLogger';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false,
    error: null,
  });

  // 初始化使用者狀態
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error) {
          logError(error, {
            component: 'AuthProvider',
            action: 'initAuth',
            severity: 'warning',
          });

          setState({
            user: null,
            loading: false,
            initialized: true,
            error: '無法獲取使用者狀態',
          });
          return;
        }

        setState({
          user: user || null,
          loading: false,
          initialized: true,
          error: null,
        });
      } catch (err: any) {
        if (!mounted) return;

        logError(err, {
          component: 'AuthProvider',
          action: 'initAuth',
          severity: 'error',
        });

        setState({
          user: null,
          loading: false,
          initialized: true,
          error: '初始化失敗',
        });
      }
    }

    initAuth();

    // 監聽認證狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        setState(prev => ({
          ...prev,
          user: session?.user || null,
          loading: false,
        }));
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setState({
        user: null,
        loading: false,
        initialized: true,
        error: null,
      });
    } catch (err: any) {
      logError(err, {
        component: 'AuthProvider',
        action: 'signOut',
        severity: 'error',
      });
    }
  };

  const refreshUser = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) throw error;

      setState({
        user: user || null,
        loading: false,
        initialized: true,
        error: null,
      });
    } catch (err: any) {
      logError(err, {
        component: 'AuthProvider',
        action: 'refreshUser',
        severity: 'error',
      });

      setState(prev => ({
        ...prev,
        loading: false,
        error: '刷新使用者狀態失敗',
      }));
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook: 使用認證狀態
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook: 要求必須登入（會自動導向登入頁）
 */
export function useRequireAuth() {
  const auth = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!auth.initialized) return;

    if (!auth.user && !auth.loading) {
      // 導向登入頁
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } else {
      setChecked(true);
    }
  }, [auth.initialized, auth.user, auth.loading]);

  return {
    ...auth,
    ready: checked && !!auth.user,
  };
}


