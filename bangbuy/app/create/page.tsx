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
    price: '',
    commission: '',
    target_country: 'JP',
    category: 'food',
    deadline: '',
    product_url: '',
    is_urgent: false,
  });

  const totalPrice = (Number(formData.price) || 0) + (Number(formData.commission) || 0);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e: any) => {
    // Fix: safe file access with validation
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Basic file type validation
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(selectedFile.type)) {
        alert('請上傳有效的圖片格式 (JPG, PNG, GIF, WEBP)');
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.title || !formData.price || !formData.deadline) {
      alert('請填寫完整資訊');
      return;
    }

    setLoading(true);

    try {
      // A. 上傳圖片
      let imageUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        // 檔名加上時間戳記避免重複
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('wish-images').upload(fileName, file);
        
        // Fix: early return on upload error to prevent undefined URL
        if (uploadError) {
          console.error('[Create] Image upload failed:', uploadError);
          throw uploadError;
        }
        
        const { data: publicUrlData } = supabase.storage.from('wish-images').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }

      // B. 確保 Profile 存在
      await supabase.from('profiles').upsert({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        role: 'buyer',
      }, { onConflict: 'id' });

      // C. 寫入許願單 (已移除 buyer_contact_type)
      const { error } = await supabase.from('wish_requests').insert([
        {
          title: formData.title,
          description: formData.description,
          budget: totalPrice,
          price: Number(formData.price),
          commission: Number(formData.commission),
          product_url: formData.product_url,
          is_urgent: formData.is_urgent,
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
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white text-center">
            <h2 className="text-3xl font-black mb-2 tracking-tight">📝 發布許願單</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* 圖片上傳 */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700">商品參考圖片</label>
            <div className="relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
              <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-h-64 object-contain rounded-lg shadow-sm"/>
              ) : (
                <div className="text-center"><span className="text-3xl">📷</span><br/><span className="text-sm text-gray-500">點擊上傳</span></div>
              )}
            </div>
          </div>

          {/* 其餘表單 (簡化顯示，請直接使用這份代碼) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div><label className="font-bold text-sm">商品名稱</label><input name="title" required className="w-full p-3 border rounded-xl mt-1" onChange={handleChange}/></div>
             <div><label className="font-bold text-sm">購買國家</label><select name="target_country" className="w-full p-3 border rounded-xl mt-1 bg-white" onChange={handleChange}><option value="JP">🇯🇵 日本</option><option value="KR">🇰🇷 韓國</option><option value="US">🇺🇸 美國</option></select></div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div><label className="font-bold text-sm">單價 (NT$)</label><input name="price" type="number" required className="w-full p-3 border rounded-xl mt-1" onChange={handleChange}/></div>
               <div><label className="font-bold text-sm">代購費 (NT$)</label><input name="commission" type="number" required className="w-full p-3 border rounded-xl mt-1" onChange={handleChange}/></div>
             </div>
             <div className="flex justify-between pt-2 font-bold text-blue-600"><span>預估總價</span><span>${totalPrice}</span></div>
          </div>

          <div><label className="font-bold text-sm">需求備註</label><textarea name="description" required rows={3} className="w-full p-3 border rounded-xl mt-1" onChange={handleChange}/></div>
          
          <div className="grid grid-cols-2 gap-6">
            <div><label className="font-bold text-sm">截止日期</label><input name="deadline" type="date" required className="w-full p-3 border rounded-xl mt-1" onChange={handleChange}/></div>
            <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 mt-6"><input name="is_urgent" type="checkbox" onChange={handleChange} className="w-5 h-5 text-red-600"/> <span className="font-bold text-red-500">這是急單！🔥</span></label>
          </div>

          {/* 🔐 內容合法提示（UGC 風險管理） */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1 space-y-2">
                <p className="text-sm text-amber-900 font-semibold leading-relaxed">
                  發布內容即表示您同意
                  <Link href="/terms" target="_blank" className="text-blue-600 hover:underline font-bold mx-1">
                    《使用條款》
                  </Link>
                  ，並保證內容合法、不侵權，且不得包含個資或詐騙導流。
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  本平台可在不另行通知下移除內容、限制功能或停權（詳見
                  <Link href="/terms" target="_blank" className="text-blue-600 hover:underline font-semibold mx-1">
                    《使用條款》
                  </Link>
                  ）。請勿發布違法商品、虛假資訊、個資、詐騙連結或侵權內容。
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Link href="/" className="w-1/3 py-3 border rounded-xl text-center font-bold text-gray-600">取消</Link>
            <button type="submit" disabled={loading} className="w-2/3 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">{loading ? '發布中...' : '確認發布'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}