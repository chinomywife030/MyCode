'use client';

/**
 * 🔔 設定頁面
 * 包含通知偏好設定
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

interface NotificationSettings {
  notify_msg_new_thread_email: boolean;
  notify_msg_unread_reminder_email: boolean;
  notify_msg_every_message_email: boolean;
  notify_msg_unread_hours: number;
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // 通知設定
  const [settings, setSettings] = useState<NotificationSettings>({
    notify_msg_new_thread_email: true,
    notify_msg_unread_reminder_email: true,
    notify_msg_every_message_email: false,
    notify_msg_unread_hours: 12,
  });

  useEffect(() => {
    async function init() {
      // 檢查登入狀態
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.assign('/login?returnTo=/settings');
        return;
      }
      setUser(user);
      
      // 取得通知設定（使用 Bearer token）
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (token) {
          const response = await fetch('/api/user/notification-settings', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setSettings(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
      
      setLoading(false);
    }
    
    init();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      // 取得 session token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        setSaveMessage('❌ 請先登入');
        setSaving(false);
        return;
      }
      
      const response = await fetch('/api/user/notification-settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        setSaveMessage('✅ 設定已儲存');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const data = await response.json();
        setSaveMessage(`❌ 儲存失敗：${data.error || '未知錯誤'}`);
      }
    } catch (error: any) {
      setSaveMessage(`❌ 儲存失敗：${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxChange = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 72) {
      setSettings(prev => ({
        ...prev,
        notify_msg_unread_hours: value,
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 返回連結 */}
        <a 
          href="/dashboard/wishes" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回會員中心
        </a>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-8">⚙️ 設定</h1>
        
        {/* 通知設定區塊 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🔔</span>
            <span>私訊 Email 通知</span>
          </h2>
          
          <p className="text-sm text-gray-500 mb-6">
            設定何時接收私訊的 Email 通知。為避免過多信件，建議保持預設設定。
          </p>
          
          <div className="space-y-5">
            {/* 新對話通知 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={settings.notify_msg_new_thread_email}
                  onChange={() => handleCheckboxChange('notify_msg_new_thread_email')}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors">
                  {settings.notify_msg_new_thread_email && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-800 font-medium">新對話收到第一則私訊時寄 Email</span>
                <p className="text-sm text-gray-500 mt-0.5">
                  當有人開啟新對話並發送第一則訊息時通知你
                </p>
              </div>
            </label>
            
            {/* 未讀提醒 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={settings.notify_msg_unread_reminder_email}
                  onChange={() => handleCheckboxChange('notify_msg_unread_reminder_email')}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors">
                  {settings.notify_msg_unread_reminder_email && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-grow">
                <span className="text-gray-800 font-medium">未讀訊息提醒</span>
                <p className="text-sm text-gray-500 mt-0.5">
                  收到訊息後若未讀取，系統會寄送提醒（同一對話 24 小時內最多提醒一次）
                </p>
                
                {/* 小時數設定 */}
                {settings.notify_msg_unread_reminder_email && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm text-gray-600">未讀超過</span>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={settings.notify_msg_unread_hours}
                      onChange={handleHoursChange}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-600">小時後寄提醒</span>
                  </div>
                )}
              </div>
            </label>
            
            {/* 每則都寄 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={settings.notify_msg_every_message_email}
                  onChange={() => handleCheckboxChange('notify_msg_every_message_email')}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors">
                  {settings.notify_msg_every_message_email && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-800 font-medium">每一則私訊都寄 Email</span>
                <p className="text-sm text-gray-500 mt-0.5">
                  收到任何訊息都立即通知（可能會收到較多信件）
                </p>
                {settings.notify_msg_every_message_email && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>開啟此選項可能會收到大量 Email</span>
                  </p>
                )}
              </div>
            </label>
          </div>
          
          {/* 儲存按鈕 */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
            <div>
              {saveMessage && (
                <p className={`text-sm ${saveMessage.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {saveMessage}
                </p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? '儲存中...' : '儲存設定'}
            </button>
          </div>
        </div>
        
        {/* 其他設定區塊預留 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>👤</span>
            <span>帳號設定</span>
          </h2>
          
          <div className="space-y-4">
            <a
              href="/profile"
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group"
            >
              <div>
                <span className="text-gray-800 font-medium">編輯個人檔案</span>
                <p className="text-sm text-gray-500 mt-0.5">更換頭像、設定顯示名稱</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            
            {user && !user.app_metadata?.is_supporter && (
              <a
                href="/supporter/checkout"
                className="flex items-center justify-between p-4 rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors group"
              >
                <div>
                  <span className="text-purple-700 font-medium">⭐ 成為 Supporter</span>
                  <p className="text-sm text-purple-600 mt-0.5">優先體驗新功能、顯示專屬徽章</p>
                </div>
                <svg className="w-5 h-5 text-purple-400 group-hover:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/**
 * 🔔 設定頁面
 * 包含通知偏好設定
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

interface NotificationSettings {
  notify_msg_new_thread_email: boolean;
  notify_msg_unread_reminder_email: boolean;
  notify_msg_every_message_email: boolean;
  notify_msg_unread_hours: number;
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // 通知設定
  const [settings, setSettings] = useState<NotificationSettings>({
    notify_msg_new_thread_email: true,
    notify_msg_unread_reminder_email: true,
    notify_msg_every_message_email: false,
    notify_msg_unread_hours: 12,
  });

  useEffect(() => {
    async function init() {
      // 檢查登入狀態
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.assign('/login?returnTo=/settings');
        return;
      }
      setUser(user);
      
      // 取得通知設定（使用 Bearer token）
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (token) {
          const response = await fetch('/api/user/notification-settings', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setSettings(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
      
      setLoading(false);
    }
    
    init();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      // 取得 session token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        setSaveMessage('❌ 請先登入');
        setSaving(false);
        return;
      }
      
      const response = await fetch('/api/user/notification-settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        setSaveMessage('✅ 設定已儲存');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const data = await response.json();
        setSaveMessage(`❌ 儲存失敗：${data.error || '未知錯誤'}`);
      }
    } catch (error: any) {
      setSaveMessage(`❌ 儲存失敗：${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxChange = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 72) {
      setSettings(prev => ({
        ...prev,
        notify_msg_unread_hours: value,
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 返回連結 */}
        <a 
          href="/dashboard/wishes" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回會員中心
        </a>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-8">⚙️ 設定</h1>
        
        {/* 通知設定區塊 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🔔</span>
            <span>私訊 Email 通知</span>
          </h2>
          
          <p className="text-sm text-gray-500 mb-6">
            設定何時接收私訊的 Email 通知。為避免過多信件，建議保持預設設定。
          </p>
          
          <div className="space-y-5">
            {/* 新對話通知 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={settings.notify_msg_new_thread_email}
                  onChange={() => handleCheckboxChange('notify_msg_new_thread_email')}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors">
                  {settings.notify_msg_new_thread_email && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-800 font-medium">新對話收到第一則私訊時寄 Email</span>
                <p className="text-sm text-gray-500 mt-0.5">
                  當有人開啟新對話並發送第一則訊息時通知你
                </p>
              </div>
            </label>
            
            {/* 未讀提醒 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={settings.notify_msg_unread_reminder_email}
                  onChange={() => handleCheckboxChange('notify_msg_unread_reminder_email')}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors">
                  {settings.notify_msg_unread_reminder_email && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-grow">
                <span className="text-gray-800 font-medium">未讀訊息提醒</span>
                <p className="text-sm text-gray-500 mt-0.5">
                  收到訊息後若未讀取，系統會寄送提醒（同一對話 24 小時內最多提醒一次）
                </p>
                
                {/* 小時數設定 */}
                {settings.notify_msg_unread_reminder_email && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm text-gray-600">未讀超過</span>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={settings.notify_msg_unread_hours}
                      onChange={handleHoursChange}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-600">小時後寄提醒</span>
                  </div>
                )}
              </div>
            </label>
            
            {/* 每則都寄 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={settings.notify_msg_every_message_email}
                  onChange={() => handleCheckboxChange('notify_msg_every_message_email')}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors">
                  {settings.notify_msg_every_message_email && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-800 font-medium">每一則私訊都寄 Email</span>
                <p className="text-sm text-gray-500 mt-0.5">
                  收到任何訊息都立即通知（可能會收到較多信件）
                </p>
                {settings.notify_msg_every_message_email && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>開啟此選項可能會收到大量 Email</span>
                  </p>
                )}
              </div>
            </label>
          </div>
          
          {/* 儲存按鈕 */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
            <div>
              {saveMessage && (
                <p className={`text-sm ${saveMessage.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {saveMessage}
                </p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? '儲存中...' : '儲存設定'}
            </button>
          </div>
        </div>
        
        {/* 其他設定區塊預留 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>👤</span>
            <span>帳號設定</span>
          </h2>
          
          <div className="space-y-4">
            <a
              href="/profile"
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group"
            >
              <div>
                <span className="text-gray-800 font-medium">編輯個人檔案</span>
                <p className="text-sm text-gray-500 mt-0.5">更換頭像、設定顯示名稱</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            
            {user && !user.app_metadata?.is_supporter && (
              <a
                href="/supporter/checkout"
                className="flex items-center justify-between p-4 rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors group"
              >
                <div>
                  <span className="text-purple-700 font-medium">⭐ 成為 Supporter</span>
                  <p className="text-sm text-purple-600 mt-0.5">優先體驗新功能、顯示專屬徽章</p>
                </div>
                <svg className="w-5 h-5 text-purple-400 group-hover:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

