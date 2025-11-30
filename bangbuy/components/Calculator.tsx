'use client';
import { useState } from 'react';

export default function Calculator() {
  const [price, setPrice] = useState<any>('');
  const [weight, setWeight] = useState<any>('');
  const [currency, setCurrency] = useState(0.22); // 預設日幣匯率

  // 計算公式：(價格 * 匯率 * 1.1代購費) + (重量 * 300運費)
  const total = price && weight 
    ? Math.round((Number(price) * currency * 1.1) + (Number(weight) * 300))
    : 0;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 max-w-sm">
      <h3 className="text-xl font-bold text-blue-600 mb-4 flex items-center gap-2">
        💰 代購計算機
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-500">選擇幣別</label>
          <select 
            className="w-full p-2 border rounded mt-1"
            onChange={(e) => setCurrency(Number(e.target.value))}
          >
            <option value={0.22}>🇯🇵 日幣 (x 0.22)</option>
            <option value={32.5}>🇺🇸 美金 (x 32.5)</option>
            <option value={0.024}>🇰🇷 韓幣 (x 0.024)</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-500">商品原價 (外幣)</label>
          <input 
            type="number" 
            placeholder="例如：1000"
            className="w-full p-2 border rounded mt-1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-500">預估重量 (公斤)</label>
          <input 
            type="number" 
            placeholder="例如：0.5"
            className="w-full p-2 border rounded mt-1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>

        <div className="pt-4 border-t mt-4">
          <p className="text-center text-gray-500 text-sm">預估到手價 (台幣)</p>
          <p className="text-center text-4xl font-bold text-blue-600 mt-1">
            ${total.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}