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

  // 計算總預算 (商品價 + 代購費)
  const totalPrice = (Number(formData.price) || 0) + (Number(formData.commission) || 0);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let imageUrl = null;
      if (file) {
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('wish-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('wish-images').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }

      await supabase.from('profiles').upsert({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        role: 'buyer',
      }, { onConflict: 'id' });

      const { error } = await supabase.from('wish_requests').insert([
        {
          title: formData.title,
          description: formData.description,
          budget: totalPrice, // 存入總金額
          price: Number(formData.price), // (可選) 如果你有加開這個欄位存原價
          commission: Number(formData.commission), // 新欄位：代購費
          product_url: formData.product_url,       // 新欄位：連結
          is_urgent: formData.is_urgent,           // 新欄位：急單
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
      router.push('/');

    } catch (error: any) {
      console.error(error);
      alert('發布失敗：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-10 text-center text-gray-500">檢查權限中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* 頂部標題區 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-8 text-white text-center">
          <h2 className="text-3xl font-black mb-2">📝 發布許願單</h2>
          <p className="opacity-90">填寫越詳細，越容易被代購選中喔！</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* 1. 圖片上傳區 */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">商品參考圖片 <span className="text-red-500">*</span></label>
            <div className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer hover:bg-gray-50 group
              ${previewUrl ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}>
              
              <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
              
              {previewUrl ? (
                <div className="relative w-full h-64">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-lg"/>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white font-bold">點擊更換圖片</div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="text-4xl block mb-2">📷</span>
                  <span className="text-blue-600 font-bold">上傳圖片</span>
                  <p className="text-gray-400 text-xs mt-1">支援 JPG, PNG</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. 基本資訊 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">商品名稱 <span className="text-red-500">*</span></label>
              <input name="title" required placeholder="例如：日本限定星巴克櫻花杯" className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" onChange={handleChange} />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">購買國家</label>
              <select name="target_country" className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" onChange={handleChange}>
                <option value="JP">🇯🇵 日本</option>
                <option value="KR">🇰🇷 韓國</option>
                <option value="US">🇺🇸 美國</option>
                <option value="UK">🇬🇧 英國</option>
                <option value="TW">🇹🇼 台灣</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">商品分類</label>
              <select name="category" className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" onChange={handleChange}>
                <option value="food">🍪 零食 / 伴手禮</option>
                <option value="beauty">💄 藥妝 / 美保</option>
                <option value="clothes">👕 服飾 / 包包</option>
                <option value="digital">📷 3C / 家電</option>
                <option value="other">📦 其他</option>
              </select>
            </div>
          </div>

          {/* 3. 價格與連結 */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">商品連結 (選填)</label>
              <input name="product_url" type="url" placeholder="https://..." className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" onChange={handleChange} />
              <p className="text-xs text-gray-400 mt-1">貼上網址讓代購更精準買到對的商品</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">商品預估單價 (台幣)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input name="price" type="number" required placeholder="1000" className="w-full pl-7 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" onChange={handleChange} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">願付代購費 (台幣)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input name="commission" type="number" required placeholder="200" className="w-full pl-7 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" onChange={handleChange} />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center border-t border-gray-200 pt-4">
              <span className="font-bold text-gray-600">總預算金額：</span>
              <span className="text-2xl font-black text-blue-600">${totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* 4. 詳細需求與急單 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">詳細需求備註</label>
            <textarea name="description" required rows={4} placeholder="請描述顏色、尺寸、數量、是否含盒..." className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" onChange={handleChange} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
               <label className="block text-sm font-bold text-gray-700 mb-2">希望截止日期</label>
               <input name="deadline" type="date" required className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" onChange={handleChange} />
            </div>

            {/* 急單開關 */}
            <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between
              ${formData.is_urgent ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <label className="flex items-center gap-3 cursor-pointer w-full">
                <input 
                  name="is_urgent" 
                  type="checkbox" 
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300" 
                  onChange={handleChange}
                />
                <div>
                  <span className={`font-bold block ${formData.is_urgent ? 'text-red-600' : 'text-gray-700'}`}>這是急單！🔥</span>
                  <span className="text-xs text-gray-500">勾選後會標示為「急件」，吸引代購優先接單</span>
                </div>
              </label>
            </div>
          </div>

          {/* 按鈕區 */}
          <div className="flex gap-4 pt-4">
            <Link href="/" className="w-1/3 py-4 border border-gray-200 text-center rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition">
              取消
            </Link>
            <button type="submit" disabled={loading} className="w-2/3 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition active:scale-95 disabled:bg-gray-400 disabled:shadow-none">
              {loading ? '發布中...' : '確認發布許願'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}