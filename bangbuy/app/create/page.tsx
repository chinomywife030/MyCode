/**
 * 📝 許願單創建頁面 (v2)
 * 
 * - 可搜尋國家選擇器
 * - 多圖上傳（最多 6 張）
 * - 完整欄位（數量、規格、預算、期限等）
 * - 草稿自動保存
 * - 提交後導流到詳情頁
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CountrySelect, MultiImageUpload, CategorySelect, ALL_COUNTRIES } from '@/components/form';
import { useWishDraft } from '@/hooks/useWishDraft';

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdWishId, setCreatedWishId] = useState<string | null>(null);

  // 草稿 Hook
  const {
    draft,
    isLoaded,
    lastSaved,
    updateField,
    clearDraft,
    hasDraft,
  } = useWishDraft();

  // 檢查登入
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('請先登入才能許願喔！');
        router.push('/login');
      } else {
        setUser(user);
      }
    }
    checkUser();
  }, [router]);

  // 計算預估總價
  const estimatedTotal = useMemo(() => {
    const price = Number(draft.price) || 0;
    const commission = Number(draft.commission) || 0;
    const qty = draft.qty || 1;
    return price * qty + commission;
  }, [draft.price, draft.commission, draft.qty]);

  // 驗證表單
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!draft.title.trim()) {
      newErrors.title = '請輸入商品名稱';
    }

    if (!draft.target_country) {
      newErrors.target_country = '請選擇購買國家';
    }

    if (!draft.price || Number(draft.price) <= 0) {
      newErrors.price = '請輸入有效的商品單價';
    }

    if (!draft.deadline) {
      newErrors.deadline = '請選擇截止日期';
    } else {
      const deadlineDate = new Date(draft.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        newErrors.deadline = '截止日期不能是過去';
      }
    }

    if (draft.qty <= 0) {
      newErrors.qty = '數量必須大於 0';
    }

    // 預算上限警告（不阻止提交）
    if (draft.budget_max && Number(draft.budget_max) < estimatedTotal) {
      newErrors.budget_warning = `預算上限 (${draft.budget_max}) 低於預估總價 (${estimatedTotal})`;
    }

    setErrors(newErrors);
    
    // 只有非 warning 的錯誤才阻止提交
    return !Object.keys(newErrors).some(key => key !== 'budget_warning');
  };

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validateForm()) {
      // 滾動到第一個錯誤
      const firstError = document.querySelector('[data-error="true"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 預算警告確認
    if (errors.budget_warning) {
      const confirmed = window.confirm(
        `${errors.budget_warning}\n\n確定要繼續發布嗎？`
      );
      if (!confirmed) return;
    }

    setLoading(true);

    try {
      // 確保 Profile 存在
      await supabase.from('profiles').upsert({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        role: 'buyer',
      }, { onConflict: 'id' });

      // 組合描述（包含額外資訊）
      const fullDescription = [
        draft.description.trim(),
        draft.qty > 1 ? `\n📦 數量：${draft.qty}` : '',
        draft.spec.trim() ? `\n📋 規格：${draft.spec.trim()}` : '',
        draft.budget_max ? `\n💰 預算上限：NT$ ${draft.budget_max}` : '',
        draft.allow_substitute ? '' : '\n⚠️ 不接受替代品',
        draft.tags.trim() ? `\n🏷️ 標籤：${draft.tags.trim()}` : '',
      ].filter(Boolean).join('');

      // 寫入許願單（只使用資料庫已有的欄位）
      const { data, error } = await supabase.from('wish_requests').insert([
        {
          title: draft.title.trim(),
          description: fullDescription,
          budget: estimatedTotal,
          price: Number(draft.price) || 0,
          commission: Number(draft.commission) || 0,
          product_url: draft.product_url.trim(),
          is_urgent: draft.is_urgent,
          target_country: draft.target_country,
          category: draft.category,
          deadline: draft.deadline,
          buyer_id: user.id,
          status: 'open',
          images: draft.image_urls,
        },
      ]).select('id').single();

      if (error) throw error;

      // 清除草稿
      clearDraft();

      // 顯示成功並導流
      setCreatedWishId(data.id);
      setShowSuccess(true);

    } catch (error: any) {
      console.error('發布失敗:', error);
      alert('發布失敗：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 複製分享連結
  const copyShareLink = () => {
    if (!createdWishId) return;
    const link = `${window.location.origin}/wish/${createdWishId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('連結已複製！');
    });
  };

  // Loading 狀態
  if (!user || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">載入中...</p>
        </div>
      </div>
    );
  }

  // 成功頁面
  if (showSuccess && createdWishId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">許願成功！</h2>
          <p className="text-gray-500 mb-8">
            你的許願單已發布，等待代購者接單中
          </p>

          <div className="space-y-3">
            <Link
              href={`/wish/${createdWishId}`}
              className="block w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              查看許願單
            </Link>

            <button
              onClick={copyShareLink}
              className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              分享連結
            </button>

            <Link
              href="/chat"
              className="block w-full py-3 text-gray-500 hover:text-gray-700 transition"
            >
              前往聊天室等待回覆 →
            </Link>

            <Link
              href="/"
              className="block w-full py-3 text-gray-400 hover:text-gray-500 transition text-sm"
            >
              返回首頁
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 找到選中的國家
  const selectedCountry = ALL_COUNTRIES.find(c => c.code === draft.target_country);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-6 sm:p-8 text-white text-center mb-6 shadow-xl">
          <h1 className="text-2xl sm:text-3xl font-black mb-2">📝 發布許願單</h1>
          <p className="text-white/80 text-sm">填寫你想購買的商品資訊</p>
        </div>

        {/* 草稿提示 */}
        {hasDraft() && lastSaved && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">📄</span>
              <span className="text-sm text-yellow-800">
                草稿已自動保存（{lastSaved.toLocaleTimeString()}）
              </span>
            </div>
            <button
              onClick={clearDraft}
              className="text-sm text-yellow-600 hover:text-yellow-800"
            >
              清除草稿
            </button>
          </div>
        )}

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* === 商品圖片 === */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              📷 商品參考圖片
              <span className="text-gray-400 font-normal ml-2">（最多 6 張）</span>
            </label>
            <MultiImageUpload
              value={draft.image_urls}
              onChange={(urls) => updateField('image_urls', urls)}
            />
          </div>

          {/* === 基本資訊 === */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span>📦</span> 商品資訊
            </h3>

            {/* 商品名稱 */}
            <div data-error={!!errors.title}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                商品名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="例如：Jellycat 兔子娃娃 30cm"
                className={`w-full p-3 border rounded-xl transition-colors ${
                  errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-500'
                }`}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* 商品連結 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                商品連結
                <span className="text-gray-400 font-normal ml-2">（可選但強烈建議）</span>
              </label>
              <input
                type="url"
                value={draft.product_url}
                onChange={(e) => updateField('product_url', e.target.value)}
                placeholder="https://..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">貼上官網或購物網站的商品頁面連結</p>
            </div>

            {/* 購買國家 */}
            <div data-error={!!errors.target_country}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                購買國家 <span className="text-red-500">*</span>
              </label>
              <CountrySelect
                value={draft.target_country}
                onChange={(code) => updateField('target_country', code)}
                error={errors.target_country}
              />
            </div>

            {/* 商品分類 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                商品分類
              </label>
              <CategorySelect
                value={draft.category}
                onChange={(val) => updateField('category', val)}
              />
            </div>
          </div>

          {/* === 規格與數量 === */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span>📋</span> 規格與數量
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* 數量 */}
              <div data-error={!!errors.qty}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  數量 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={draft.qty}
                  onChange={(e) => updateField('qty', Math.max(1, parseInt(e.target.value) || 1))}
                  className={`w-full p-3 border rounded-xl transition-colors ${
                    errors.qty ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-500'
                  }`}
                />
                {errors.qty && <p className="text-xs text-red-500 mt-1">{errors.qty}</p>}
              </div>

              {/* 規格 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  顏色/尺寸/型號
                </label>
                <input
                  type="text"
                  value={draft.spec}
                  onChange={(e) => updateField('spec', e.target.value)}
                  placeholder="例如：白色 M 號"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* 可接受替代品 */}
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
              <input
                type="checkbox"
                checked={draft.allow_substitute}
                onChange={(e) => updateField('allow_substitute', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <span className="font-semibold text-gray-700">可接受替代品</span>
                <p className="text-xs text-gray-500">若指定商品缺貨，代購者可提供相似替代品</p>
              </div>
            </label>
          </div>

          {/* === 價格 === */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span>💰</span> 價格資訊
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* 單價 */}
              <div data-error={!!errors.price}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  商品單價 (NT$) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.price}
                  onChange={(e) => updateField('price', e.target.value ? Number(e.target.value) : '')}
                  placeholder="0"
                  className={`w-full p-3 border rounded-xl transition-colors ${
                    errors.price ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-500'
                  }`}
                />
                {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
              </div>

              {/* 代購費 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  代購費 (NT$)
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.commission}
                  onChange={(e) => updateField('commission', e.target.value ? Number(e.target.value) : '')}
                  placeholder="建議 100-500"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* 預算上限 */}
            <div data-error={!!errors.budget_warning}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                預算上限 (NT$)
                <span className="text-gray-400 font-normal ml-2">（可選）</span>
              </label>
              <input
                type="number"
                min="0"
                value={draft.budget_max}
                onChange={(e) => updateField('budget_max', e.target.value ? Number(e.target.value) : '')}
                placeholder="超過此金額需先確認"
                className={`w-full p-3 border rounded-xl transition-colors ${
                  errors.budget_warning ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 focus:border-blue-500'
                }`}
              />
              {errors.budget_warning && (
                <p className="text-xs text-yellow-600 mt-1">⚠️ {errors.budget_warning}</p>
              )}
            </div>

            {/* 預估總價 */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">預估總價</span>
                <span className="text-2xl font-bold text-blue-600">
                  NT$ {estimatedTotal.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                = 單價 ({draft.price || 0}) × 數量 ({draft.qty}) + 代購費 ({draft.commission || 0})
              </p>
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ 可能另含國際運費、關稅等費用
              </p>
            </div>
          </div>

          {/* === 期限與其他 === */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span>📅</span> 期限與備註
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 截止日期 */}
              <div data-error={!!errors.deadline}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  希望完成日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={draft.deadline}
                  onChange={(e) => updateField('deadline', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full p-3 border rounded-xl transition-colors ${
                    errors.deadline ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-500'
                  }`}
                />
                {errors.deadline && <p className="text-xs text-red-500 mt-1">{errors.deadline}</p>}
                <p className="text-xs text-gray-400 mt-1">代購者需在此日期前完成購買</p>
              </div>

              {/* 急單 */}
              <div className="flex items-end">
                <label className="flex items-center gap-3 p-3 border-2 border-red-200 rounded-xl cursor-pointer hover:bg-red-50 transition w-full">
                  <input
                    type="checkbox"
                    checked={draft.is_urgent}
                    onChange={(e) => updateField('is_urgent', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded"
                  />
                  <span className="font-bold text-red-500">🔥 這是急單！</span>
                </label>
              </div>
            </div>

            {/* 備註 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                需求備註
              </label>
              <textarea
                rows={3}
                value={draft.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="其他補充說明，例如：限定版、特定店鋪購買等"
                className="w-full p-3 border border-gray-200 rounded-xl focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            {/* 標籤 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                關鍵字標籤
                <span className="text-gray-400 font-normal ml-2">（用逗號分隔）</span>
              </label>
              <input
                type="text"
                value={draft.tags}
                onChange={(e) => updateField('tags', e.target.value)}
                placeholder="例如：jellycat, selfridges, 限定版"
                className="w-full p-3 border border-gray-200 rounded-xl focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* === 法律提示 === */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1 space-y-1">
                <p className="text-sm text-amber-900 font-semibold">
                  發布內容即表示您同意
                  <Link href="/terms" target="_blank" className="text-blue-600 hover:underline font-bold mx-1">
                    《使用條款》
                  </Link>
                </p>
                <p className="text-xs text-amber-800">
                  請勿發布違法商品、虛假資訊、個資、詐騙連結或侵權內容。
                </p>
              </div>
            </div>
          </div>

          {/* === 提交按鈕 === */}
          <div className="flex gap-4">
            <Link
              href="/"
              className="w-1/3 py-3.5 border-2 border-gray-200 rounded-xl text-center font-bold text-gray-600 hover:bg-gray-50 transition"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  發布中...
                </>
              ) : (
                '確認發布'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
