/**
 * 🌍 CountrySelect - 可搜尋國家選擇器
 * 
 * - 支援搜尋（中文/英文/國碼）
 * - 常用國家置頂
 * - 記住上次選擇
 */

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

// 國家清單（熱門置頂）
const POPULAR_COUNTRIES = ['JP', 'KR', 'US', 'DE', 'UK', 'FR'];

const ALL_COUNTRIES = [
  // 熱門
  { code: 'JP', name: '日本', emoji: '🇯🇵' },
  { code: 'KR', name: '韓國', emoji: '🇰🇷' },
  { code: 'US', name: '美國', emoji: '🇺🇸' },
  { code: 'DE', name: '德國', emoji: '🇩🇪' },
  { code: 'UK', name: '英國', emoji: '🇬🇧' },
  { code: 'FR', name: '法國', emoji: '🇫🇷' },
  // 歐洲
  { code: 'IT', name: '義大利', emoji: '🇮🇹' },
  { code: 'ES', name: '西班牙', emoji: '🇪🇸' },
  { code: 'NL', name: '荷蘭', emoji: '🇳🇱' },
  { code: 'BE', name: '比利時', emoji: '🇧🇪' },
  { code: 'CH', name: '瑞士', emoji: '🇨🇭' },
  { code: 'AT', name: '奧地利', emoji: '🇦🇹' },
  { code: 'CZ', name: '捷克', emoji: '🇨🇿' },
  { code: 'PL', name: '波蘭', emoji: '🇵🇱' },
  { code: 'SE', name: '瑞典', emoji: '🇸🇪' },
  { code: 'NO', name: '挪威', emoji: '🇳🇴' },
  { code: 'DK', name: '丹麥', emoji: '🇩🇰' },
  { code: 'FI', name: '芬蘭', emoji: '🇫🇮' },
  { code: 'IE', name: '愛爾蘭', emoji: '🇮🇪' },
  { code: 'PT', name: '葡萄牙', emoji: '🇵🇹' },
  { code: 'GR', name: '希臘', emoji: '🇬🇷' },
  { code: 'HU', name: '匈牙利', emoji: '🇭🇺' },
  // 北美/大洋洲
  { code: 'CA', name: '加拿大', emoji: '🇨🇦' },
  { code: 'AU', name: '澳洲', emoji: '🇦🇺' },
  { code: 'NZ', name: '紐西蘭', emoji: '🇳🇿' },
  // 亞洲
  { code: 'TW', name: '台灣', emoji: '🇹🇼' },
  { code: 'HK', name: '香港', emoji: '🇭🇰' },
  { code: 'MO', name: '澳門', emoji: '🇲🇴' },
  { code: 'SG', name: '新加坡', emoji: '🇸🇬' },
  { code: 'TH', name: '泰國', emoji: '🇹🇭' },
  { code: 'VN', name: '越南', emoji: '🇻🇳' },
  { code: 'MY', name: '馬來西亞', emoji: '🇲🇾' },
  { code: 'ID', name: '印尼', emoji: '🇮🇩' },
  { code: 'PH', name: '菲律賓', emoji: '🇵🇭' },
  { code: 'CN', name: '中國', emoji: '🇨🇳' },
  { code: 'IN', name: '印度', emoji: '🇮🇳' },
  // 中東
  { code: 'AE', name: '阿聯酋', emoji: '🇦🇪' },
  { code: 'TR', name: '土耳其', emoji: '🇹🇷' },
];

const STORAGE_KEY = 'bangbuy_last_country';

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  error?: string;
}

export default function CountrySelect({
  value,
  onChange,
  className = '',
  error,
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 讀取上次選擇
  useEffect(() => {
    if (!value) {
      try {
        const lastCountry = localStorage.getItem(STORAGE_KEY);
        if (lastCountry && ALL_COUNTRIES.find(c => c.code === lastCountry)) {
          onChange(lastCountry);
        } else {
          onChange('JP'); // 預設日本
        }
      } catch {
        onChange('JP');
      }
    }
  }, [value, onChange]);

  // 保存選擇
  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearch('');
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
  };

  // 過濾國家
  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();
    
    if (!query) {
      // 沒搜尋時，熱門置頂
      const popular = ALL_COUNTRIES.filter(c => POPULAR_COUNTRIES.includes(c.code));
      const others = ALL_COUNTRIES.filter(c => !POPULAR_COUNTRIES.includes(c.code));
      return [...popular, ...others];
    }

    return ALL_COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query) ||
      c.emoji.includes(query)
    );
  }, [search]);

  // 當前選中的國家
  const selectedCountry = ALL_COUNTRIES.find(c => c.code === value);

  // 點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 鍵盤導航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, filteredCountries.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCountries[highlightIndex]) {
          handleSelect(filteredCountries[highlightIndex].code);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        break;
    }
  };

  // 開啟時重置 highlight
  useEffect(() => {
    if (isOpen) {
      setHighlightIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 觸發按鈕 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          w-full p-3 border rounded-xl bg-white text-left
          flex items-center justify-between gap-2
          transition-all duration-200
          ${error ? 'border-red-300 focus:ring-red-500/20' : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20'}
          ${isOpen ? 'ring-4 ring-blue-500/20 border-blue-500' : ''}
        `}
      >
        <span className="flex items-center gap-2">
          {selectedCountry ? (
            <>
              <span className="text-xl">{selectedCountry.emoji}</span>
              <span className="font-medium">{selectedCountry.name}</span>
              <span className="text-gray-400 text-sm">{selectedCountry.code}</span>
            </>
          ) : (
            <span className="text-gray-400">選擇國家...</span>
          )}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* 搜尋框 */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜尋國家..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* 選項列表 */}
          <div className="max-h-60 overflow-y-auto">
            {!search && (
              <div className="px-3 py-1.5 text-xs text-gray-400 font-medium bg-gray-50">
                🔥 熱門國家
              </div>
            )}
            
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                找不到符合的國家
              </div>
            ) : (
              filteredCountries.map((country, index) => {
                const isPopular = POPULAR_COUNTRIES.includes(country.code);
                const showDivider = !search && index === POPULAR_COUNTRIES.length;

                return (
                  <div key={country.code}>
                    {showDivider && (
                      <div className="px-3 py-1.5 text-xs text-gray-400 font-medium bg-gray-50">
                        🌍 所有國家
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelect(country.code)}
                      className={`
                        w-full px-3 py-2.5 text-left flex items-center gap-3
                        transition-colors duration-100
                        ${index === highlightIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}
                        ${value === country.code ? 'bg-blue-50 font-medium' : ''}
                      `}
                    >
                      <span className="text-xl">{country.emoji}</span>
                      <span className="flex-1">{country.name}</span>
                      <span className="text-gray-400 text-sm">{country.code}</span>
                      {value === country.code && (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 導出國家列表供其他組件使用
export { ALL_COUNTRIES, POPULAR_COUNTRIES };













