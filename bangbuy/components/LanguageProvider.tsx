'use client';

import { createContext, useContext, useState } from 'react';
import { dictionary } from '@/lib/dictionary';

// 1. 這裡定義我們支援哪些語言代碼
type LangCode = 'zh' | 'en' | 'jp' | 'kr';

type LanguageContextType = {
  lang: LangCode;
  t: typeof dictionary.zh;
  changeLanguage: (lang: LangCode) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LangCode>('zh');

  const changeLanguage = (newLang: LangCode) => {
    setLang(newLang);
  };

  const t = dictionary[lang];

  return (
    <LanguageContext.Provider value={{ lang, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}