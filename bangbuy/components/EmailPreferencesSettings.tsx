'use client';

/**
 * 📧 Email 通知設定組件
 * 讓用戶管理各類 Email 通知的開關
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface EmailPreferences {
  offerNotifications: boolean;
  acceptRejectNotifications: boolean;
  messageDigest: boolean;
}

export default function EmailPreferencesSettings() {
  const [preferences, setPreferences] = useState<EmailPreferences>({
    offerNotifications: true,
    acceptRejectNotifications: true,
    messageDigest: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 載入用戶設定
  useEffect(() => {
    async function loadPreferences() {
      try {
        const { data, error } = await supabase.rpc('get_email_preferences');
        
        if (error) {
          console.error('[EmailPreferences] Load error:', error);
          return;
        }

        if (data?.success && data.preferences) {
          setPreferences({
            offerNotifications: data.preferences.offer_notifications ?? true,
            acceptRejectNotifications: data.preferences.accept_reject_notifications ?? true,
            messageDigest: data.preferences.message_digest ?? true,
          });
        }
      } catch (err) {
        console.error('[EmailPreferences] Exception:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, []);

  // 儲存設定
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_email_preferences', {
        p_offer_notifications: preferences.offerNotifications,
        p_accept_reject_notifications: preferences.acceptRejectNotifications,
        p_message_digest: preferences.messageDigest,
      });

      if (error) {
        console.error('[EmailPreferences] Save error:', error);
        alert('儲存失敗，請稍後再試');
        return;
      }

      if (data?.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (err) {
      console.error('[EmailPreferences] Exception:', err);
      alert('發生錯誤，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  // 切換設定
  const handleToggle = (key: keyof EmailPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-100 rounded"></div>
            <div className="h-12 bg-gray-100 rounded"></div>
            <div className="h-12 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email 通知設定
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          管理你想收到的 Email 通知類型
        </p>
      </div>

      {/* Settings List */}
      <div className="p-6 space-y-4">
        {/* 報價通知 */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
          <div className="flex-1 pr-4">
            <p className="font-medium text-gray-900">報價通知</p>
            <p className="text-sm text-gray-500">
              當有人對你的需求報價時，收到 Email 通知
            </p>
          </div>
          <button
            onClick={() => handleToggle('offerNotifications')}
            className={`
              relative w-12 h-6 rounded-full transition-colors duration-200
              ${preferences.offerNotifications ? 'bg-blue-500' : 'bg-gray-300'}
            `}
            aria-label="切換報價通知"
          >
            <span
              className={`
                absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
                ${preferences.offerNotifications ? 'translate-x-6' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        {/* 接受/拒絕通知 */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
          <div className="flex-1 pr-4">
            <p className="font-medium text-gray-900">接受/拒絕通知</p>
            <p className="text-sm text-gray-500">
              當你的報價被接受或拒絕時，收到 Email 通知
            </p>
          </div>
          <button
            onClick={() => handleToggle('acceptRejectNotifications')}
            className={`
              relative w-12 h-6 rounded-full transition-colors duration-200
              ${preferences.acceptRejectNotifications ? 'bg-blue-500' : 'bg-gray-300'}
            `}
            aria-label="切換接受/拒絕通知"
          >
            <span
              className={`
                absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
                ${preferences.acceptRejectNotifications ? 'translate-x-6' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        {/* 新訊息摘要 */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
          <div className="flex-1 pr-4">
            <p className="font-medium text-gray-900">新訊息摘要</p>
            <p className="text-sm text-gray-500">
              當有未讀訊息時，收到聚合通知（每 15 分鐘最多一封）
            </p>
          </div>
          <button
            onClick={() => handleToggle('messageDigest')}
            className={`
              relative w-12 h-6 rounded-full transition-colors duration-200
              ${preferences.messageDigest ? 'bg-blue-500' : 'bg-gray-300'}
            `}
            aria-label="切換新訊息摘要"
          >
            <span
              className={`
                absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
                ${preferences.messageDigest ? 'translate-x-6' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          變更將在下次通知時生效
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm transition
            ${saving 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }
          `}
        >
          {saving ? '儲存中...' : showSuccess ? '✓ 已儲存' : '儲存設定'}
        </button>
      </div>
    </div>
  );
}


















