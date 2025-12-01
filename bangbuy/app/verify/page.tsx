'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VerifyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
    }
    getUser();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return alert('請選擇圖片');
    setLoading(true);

    try {
      // 1. 上傳證件照
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 取得圖片路徑 (注意：這是私有 Bucket，通常存 path 即可，後端審核才生成簽名 URL，這裡簡化流程存 path)
      const filePath = fileName;

      // 2. 更新 Profile 狀態
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending', // 變成審核中
          student_card_url: filePath
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      alert('🎉 送出成功！我們會盡快審核您的資料。');
      router.push('/dashboard');

    } catch (error: any) {
      console.error(error);
      alert('發生錯誤：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">🔐 身份認證</h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          為了保障交易安全，發布行程或接單前，請先上傳學生證或身分證件進行核實。
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 flex flex-col items-center justify-center bg-blue-50/50 hover:bg-blue-50 transition cursor-pointer relative">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="max-h-48 rounded-lg shadow-sm" />
            ) : (
              <>
                <span className="text-4xl mb-2">🆔</span>
                <span className="text-blue-600 font-bold">點擊上傳證件</span>
                <span className="text-gray-400 text-xs mt-1">支援 JPG, PNG 格式</span>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg disabled:bg-gray-400 disabled:shadow-none"
          >
            {loading ? '上傳中...' : '提交審核'}
          </button>

          <div className="text-center">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
              暫時略過，回會員中心
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}