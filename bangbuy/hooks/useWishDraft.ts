/**
 * 📝 useWishDraft - 許願單草稿保存 Hook
 * 
 * - debounce 自動保存
 * - 頁面重載恢復
 * - 提交成功後清除
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const DRAFT_KEY = 'bangbuy_wish_draft_v2';
const DEBOUNCE_MS = 500;

export interface WishDraft {
  // 基本資訊
  title: string;
  description: string;
  target_country: string;
  category: string;
  
  // 價格
  price: number | '';
  commission: number | '';
  budget_max: number | '';
  
  // 規格
  qty: number;
  spec: string;
  product_url: string;
  
  // 選項
  deadline: string;
  is_urgent: boolean;
  allow_substitute: boolean;
  
  // 圖片（已上傳的 URLs）
  image_urls: string[];
  
  // 標籤
  tags: string;
  
  // 草稿時間
  _savedAt?: number;
}

const DEFAULT_DRAFT: WishDraft = {
  title: '',
  description: '',
  target_country: 'JP',
  category: 'other',
  price: '',
  commission: '',
  budget_max: '',
  qty: 1,
  spec: '',
  product_url: '',
  deadline: '',
  is_urgent: false,
  allow_substitute: true,
  image_urls: [],
  tags: '',
};

export function useWishDraft() {
  const [draft, setDraft] = useState<WishDraft>(DEFAULT_DRAFT);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 載入草稿
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as WishDraft;
        // 驗證草稿是否過期（7天）
        if (parsed._savedAt && Date.now() - parsed._savedAt < 7 * 24 * 60 * 60 * 1000) {
          setDraft(parsed);
          setLastSaved(new Date(parsed._savedAt));
        } else {
          // 過期清除
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
    setIsLoaded(true);
  }, []);

  // 保存草稿（debounced）
  const saveDraft = useCallback((newDraft: WishDraft) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        const toSave = { ...newDraft, _savedAt: Date.now() };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave));
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to save draft:', err);
      }
    }, DEBOUNCE_MS);
  }, []);

  // 更新草稿
  const updateDraft = useCallback((updates: Partial<WishDraft>) => {
    setDraft(prev => {
      const newDraft = { ...prev, ...updates };
      saveDraft(newDraft);
      return newDraft;
    });
  }, [saveDraft]);

  // 更新單一欄位
  const updateField = useCallback(<K extends keyof WishDraft>(key: K, value: WishDraft[K]) => {
    updateDraft({ [key]: value } as Partial<WishDraft>);
  }, [updateDraft]);

  // 清除草稿
  const clearDraft = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setDraft(DEFAULT_DRAFT);
    setLastSaved(null);
  }, []);

  // 檢查是否有內容
  const hasDraft = useCallback(() => {
    return draft.title.trim() !== '' || 
           draft.description.trim() !== '' ||
           draft.image_urls.length > 0;
  }, [draft]);

  return {
    draft,
    isLoaded,
    lastSaved,
    updateDraft,
    updateField,
    clearDraft,
    hasDraft,
  };
}


