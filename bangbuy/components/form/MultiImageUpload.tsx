/**
 * 📷 MultiImageUpload - 多圖上傳組件
 * 
 * - 支援多張上傳（最多 6 張）
 * - 預覽、刪除、拖曳排序
 * - 上傳進度顯示
 */

'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const MAX_IMAGES = 6;
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ImageItem {
  id: string;
  url: string;
  file?: File;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

interface MultiImageUploadProps {
  value: string[]; // 已上傳的 URLs
  onChange: (urls: string[]) => void;
  maxImages?: number;
  className?: string;
}

export default function MultiImageUpload({
  value = [],
  onChange,
  maxImages = MAX_IMAGES,
  className = '',
}: MultiImageUploadProps) {
  const [images, setImages] = useState<ImageItem[]>(() => 
    value.map((url, i) => ({ id: `existing-${i}`, url }))
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 上傳圖片到 Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('wish-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from('wish-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (err) {
      console.error('Upload failed:', err);
      return null;
    }
  };

  // 處理檔案選擇
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 計算可添加數量
    const availableSlots = maxImages - images.length;
    const filesToAdd = files.slice(0, availableSlots);

    if (files.length > availableSlots) {
      alert(`最多只能上傳 ${maxImages} 張圖片，已選取前 ${availableSlots} 張`);
    }

    // 驗證並創建預覽
    const newImages: ImageItem[] = [];
    
    for (const file of filesToAdd) {
      // 驗證類型
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`${file.name} 格式不支援，請上傳 JPG/PNG/WEBP`);
        continue;
      }

      // 驗證大小
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`${file.name} 超過 ${MAX_SIZE_MB}MB 限制`);
        continue;
      }

      const id = `new-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const previewUrl = URL.createObjectURL(file);
      
      newImages.push({
        id,
        url: previewUrl,
        file,
        uploading: true,
        progress: 0,
      });
    }

    if (newImages.length === 0) return;

    // 更新 state
    setImages(prev => [...prev, ...newImages]);

    // 上傳每張圖片
    for (const img of newImages) {
      if (!img.file) continue;

      const uploadedUrl = await uploadImage(img.file);

      setImages(prev => {
        const updated = prev.map(item => {
          if (item.id !== img.id) return item;
          
          if (uploadedUrl) {
            // 釋放預覽 URL
            URL.revokeObjectURL(item.url);
            return { ...item, url: uploadedUrl, uploading: false, file: undefined };
          } else {
            return { ...item, uploading: false, error: '上傳失敗' };
          }
        });
        
        // 使用 setTimeout 同步到父組件，避免在渲染期間 setState
        const urls = updated
          .filter(i => !i.uploading && !i.error && !i.url.startsWith('blob:'))
          .map(i => i.url);
        setTimeout(() => onChange(urls), 0);
        
        return updated;
      });
    }

    // 清空 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 刪除圖片
  const handleDelete = (id: string) => {
    setImages(prev => {
      const item = prev.find(img => img.id === id);
      if (item?.url.startsWith('blob:')) {
        URL.revokeObjectURL(item.url);
      }
      const newImages = prev.filter(img => img.id !== id);
      
      // 使用 setTimeout 更新 parent，避免在渲染期間 setState
      const urls = newImages
        .filter(img => !img.uploading && !img.error && !img.url.startsWith('blob:'))
        .map(img => img.url);
      setTimeout(() => onChange(urls), 0);
      
      return newImages;
    });
  };

  // 拖曳開始
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // 拖曳結束
  const handleDragEnd = () => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setImages(prev => {
      const newImages = [...prev];
      const [dragged] = newImages.splice(draggedIndex, 1);
      newImages.splice(dragOverIndex, 0, dragged);
      
      // 使用 setTimeout 更新 parent，避免在渲染期間 setState
      const urls = newImages
        .filter(img => !img.uploading && !img.error && !img.url.startsWith('blob:'))
        .map(img => img.url);
      setTimeout(() => onChange(urls), 0);
      
      return newImages;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className={className}>
      {/* 上傳區塊 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {/* 已有圖片 */}
        {images.map((img, index) => (
          <div
            key={img.id}
            draggable={!img.uploading}
            onDragStart={() => handleDragStart(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            className={`
              relative aspect-square rounded-xl overflow-hidden
              border-2 transition-all duration-200
              ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
              ${dragOverIndex === index && draggedIndex !== index ? 'border-blue-500 scale-105' : 'border-gray-200'}
              ${img.error ? 'border-red-300' : ''}
              group cursor-move
            `}
          >
            <img
              src={img.url}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
            />

            {/* 上傳中 */}
            {img.uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* 錯誤 */}
            {img.error && (
              <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center p-2">
                <span className="text-white text-xs text-center">{img.error}</span>
              </div>
            )}

            {/* Hover 操作 */}
            {!img.uploading && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}

            {/* 序號 */}
            <div className="absolute top-1 left-1 w-5 h-5 bg-black/60 text-white text-xs rounded-full flex items-center justify-center">
              {index + 1}
            </div>
          </div>
        ))}

        {/* 添加按鈕 */}
        {canAddMore && (
          <label className="
            aspect-square rounded-xl border-2 border-dashed border-gray-300
            flex flex-col items-center justify-center gap-1
            cursor-pointer hover:border-blue-500 hover:bg-blue-50
            transition-colors
          ">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs text-gray-400">添加</span>
          </label>
        )}
      </div>

      {/* 提示 */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          {images.length}/{maxImages} 張（拖曳可排序）
        </span>
        <span>
          支援 JPG/PNG/WEBP，每張最大 {MAX_SIZE_MB}MB
        </span>
      </div>
    </div>
  );
}

