'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // 1. 檢查登入狀態
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
  
  // 2. 表單狀態管理
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',      // 商品原價
    commission: '', // 代購費
    target_country: 'JP',
    category: 'food',
    deadline: '',
    product_url: '',
    is_urgent: false,
  });

  // 自動計算總預算 (商品價 + 代購費)
  const totalPrice = (Number(formData.price) || 0) + (Number(formData.commission) || 0);

  // 處理輸入變更
  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 處理圖片選擇
  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  // 3. 送出表單
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user) return;
    
    // 簡單驗證
    if (!formData.title || !formData.price || !formData.deadline) {
      alert('請填寫完整資訊');
      return;
    }

    setLoading(true);

    try {
      // A. 上傳圖片 (如果有)
      let imageUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('wish-images').upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('wish-images').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }

      // B. 確保 Profile 存在
      await supabase.from('profiles').upsert({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        role: 'buyer',
      }, { onConflict: 'id' });

      // C. 寫入許願單資料庫
      const { error } = await supabase.from('wish_requests').insert([
        {
          title: formData.title,
          description: formData.description,
          budget: totalPrice,            // 總預算 (用於搜尋篩選)
          price: Number(formData.price), // 商品原價
          commission: Number(formData.commission), // 代購費
          product_url: formData.product_url,       // 商品連結
          is_urgent: formData.is_urgent,           // 急單標記
          target_country: formData.target_country,
          category: formData.category,
          deadline: formData.deadline,
          buyer_id: user.id,
          status: 'open',
          images: imageUrl ? [imageUrl] : [],
        },
      ]);

      if (error) throw error;
      
      alert('🎉 許願成功！等待代購接單中...');
      router.push('/'); // 回首頁

    } catch (error: any) {
      console.error('發布失敗:', error);
      alert('發布失敗：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-500">檢查權限中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* 頂部標題區 */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-2 tracking-tight">📝 發布許願單</h2>
            <p className="opacity-90 font-medium">填寫越詳細，越容易被代購選中喔！</p>
          </div>
          {/* 裝飾背景 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-8 -mb-8 blur-lg"></div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* 1. 圖片上傳區 */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700">
              商品參考圖片 <span className="text-red-500">*</span>
            </label>
            <div className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer hover:border-blue-400 group
              ${previewUrl ? 'border-blue-300 bg-blue-50/50' : 'border-gray-300 hover:bg-gray-50'}`}>
              
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              
              {previewUrl ? (
                <div className="relative w-full h-64">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-lg shadow-sm"/>
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-lg">
                    <span className="text-white font-bold border-2 border-white px-4 py-2 rounded-full">更換圖片</span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
                    📷
                  </div>
                  <span className="text-gray-900 font-bold block">點擊上傳圖片</span>
                  <p className="text-gray-400 text-xs mt-1">支援 JPG, PNG 格式</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. 基本資訊 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                商品名稱 <span className="text-red-500">*</span>
              </label>
              <input 
                name="title" 
                required 
                placeholder="例如：日本限定星巴克櫻花杯" 
                className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 focus:bg-white" 
                onChange={handleChange} 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">購買國家</label>
              <div className="relative">
                <select name="target_country" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white cursor-pointer font-medium" onChange={handleChange}>
                  <option value="JP">🇯🇵 日本</option>
                  <option value="KR">🇰🇷 韓國</option>
                  <option value="US">🇺🇸 美國</option>
                  <option value="UK">🇬🇧 英國</option>
                  <option value="TW">🇹🇼 台灣</option>
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">商品分類</label>
              <div className="relative">
                <select name="category" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white cursor-pointer font-medium" onChange={handleChange}>
                  <option value="food">🍪 零食 / 伴手禮</option>
                  <option value="beauty">💄 藥妝 / 美保</option>
                  <option value="clothes">👕 服飾 / 包包</option>
                  <option value="digital">📷 3C / 家電</option>
                  <option value="other">📦 其他</option>
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
              </div>
            </div>
          </div>

          {/* 3. 價格與連結 */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">商品連結 (選填)</label>
              <input 
                name="product_url" 
                type="url" 
                placeholder="https://www.amazon.co.jp/..." 
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-blue-600" 
                onChange={handleChange} 
              />
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                ℹ️ 貼上網址讓代購更精準買到對的商品
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">商品單價 (台幣)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input 
                    name="price" 
                    type="number" 
                    required 
                    placeholder="1000" 
                    className="w-full pl-8 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700" 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">願付代購費</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input 
                    name="commission" 
                    type="number" 
                    required 
                    placeholder="200" 
                    className="w-full pl-8 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700" 
                    onChange={handleChange} 
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center border-t border-gray-200 pt-4 mt-2">
              <span className="font-bold text-gray-500 text-sm">預估總金額</span>
              <span className="text-3xl font-black text-blue-600 tracking-tight">${totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* 4. 詳細需求與急單 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">詳細需求備註 <span className="text-red-500">*</span></label>
            <textarea 
              name="description" 
              required 
              rows={4} 
              placeholder="請詳細描述商品規格：顏色、尺寸、數量、是否需要保留包裝盒..." 
              className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none" 
              onChange={handleChange} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <div>
               <label className="block text-sm font-bold text-gray-700 mb-2">希望截止日期</label>
               <input 
                 name="deadline" 
                 type="date" 
                 required 
                 className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none h-[60px]" 
                 onChange={handleChange} 
               />
            </div>

            {/* 急單開關 */}
            <label className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between h-[60px] mt-7 md:mt-0
              ${formData.is_urgent ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="flex items-center gap-3">
                <input 
                  name="is_urgent" 
                  type="checkbox" 
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300" 
                  onChange={handleChange}
                />
                <div>
                  <span className={`font-bold block text-sm ${formData.is_urgent ? 'text-red-600' : 'text-gray-700'}`}>
                    這是急單！🔥
                  </span>
                </div>
              </div>
              {formData.is_urgent && <span className="text-xs text-red-500 font-bold px-2 py-1 bg-red-100 rounded">Urgent</span>}
            </label>
          </div>

          {/* 按鈕區 */}
          <div className="flex gap-4 pt-6 border-t border-gray-100">
            <Link href="/" className="w-1/3 py-4 border border-gray-300 text-center rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition">
              取消
            </Link>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-2/3 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl transition active:scale-95 disabled:bg-gray-400 disabled:shadow-none flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  發布中...
                </>
              ) : (
                '確認發布許願 ✨'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}