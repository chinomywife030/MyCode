'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
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
    budget: '',
    target_country: 'JP',
    category: 'food',
    deadline: '',
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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

      // 這裡修正了 contact_type 為 chat
      const { error } = await supabase.from('wish_requests').insert([
        {
          title: formData.title,
          description: formData.description,
          budget: Number(formData.budget),
          target_country: formData.target_country,
          category: formData.category,
          deadline: formData.deadline,
          buyer_contact_type: 'chat',
          buyer_contact_value: 'In-App Chat',
          buyer_id: user.id,
          status: 'open',
          images: imageUrl ? [imageUrl] : [],
        },
      ]);

      if (error) throw error;
      alert('🎉 許願成功！');
      router.push('/');

    } catch (error: any) {
      console.error(error);
      alert('發生錯誤：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-10 text-center">檢查權限中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          📝 我要發布許願單
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <label className="block text-sm font-medium text-blue-800 mb-2">上傳商品參考圖</label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:bg-blue-600 file:text-white file:rounded-full file:px-4 file:py-2 file:border-0 hover:file:bg-blue-700"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">商品名稱</label>
            <input name="title" required placeholder="例如：日本限定星巴克杯" className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" onChange={handleChange} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">商品分類</label>
            <select name="category" className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" onChange={handleChange}>
              <option value="food">🍪 零食 / 伴手禮</option>
              <option value="beauty">💄 藥妝 / 美保</option>
              <option value="clothes">👕 服飾 / 包包</option>
              <option value="digital">📷 3C / 家電</option>
              <option value="other">📦 其他</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">購買國家</label>
              <select name="target_country" className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" onChange={handleChange}>
                <option value="JP">🇯🇵 日本</option>
                <option value="KR">🇰🇷 韓國</option>
                <option value="US">🇺🇸 美國</option>
                <option value="UK">🇬🇧 英國</option>
                <option value="TW">🇹🇼 台灣</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">預算 (台幣)</label>
              <input name="budget" type="number" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" onChange={handleChange} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">詳細描述 / 網址</label>
            <textarea name="description" required rows={3} placeholder="請描述顏色、尺寸、數量..." className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" onChange={handleChange} />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700">希望截止日期</label>
             <input name="deadline" type="date" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" onChange={handleChange} />
          </div>

          <div className="flex gap-4">
            <Link href="/" className="w-1/3 py-3 border border-gray-300 text-center rounded-md text-gray-600 font-medium hover:bg-gray-50">取消</Link>
            <button type="submit" disabled={loading} className="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium shadow-sm">
              {loading ? '發布中...' : '送出許願單'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}