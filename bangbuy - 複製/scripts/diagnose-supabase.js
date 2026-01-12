/**
 * 🔍 Supabase 連接診斷工具
 * 
 * 使用方式：
 * node scripts/diagnose-supabase.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 錯誤：請確保 .env.local 文件中設置了 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 開始診斷 Supabase 連接...\n');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...\n');

async function diagnose() {
  const results = {
    connection: false,
    wishRequests: false,
    trips: false,
    profiles: false,
    rlsIssue: false,
  };

  // 1. 測試基本連接
  console.log('1️⃣ 測試基本連接...');
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('wish_requests')
      .select('count', { count: 'exact', head: true });
    
    const duration = Date.now() - start;
    
    if (error) {
      console.error('   ❌ 連接失敗:', error.message);
      if (error.message.includes('permission denied')) {
        console.error('   🚨 這是 RLS 權限問題！');
        results.rlsIssue = true;
      }
    } else {
      console.log(`   ✅ 連接成功 (${duration}ms)`);
      results.connection = true;
    }
  } catch (err) {
    console.error('   ❌ 連接錯誤:', err.message);
  }

  // 2. 測試 wish_requests 表
  console.log('\n2️⃣ 測試 wish_requests 表...');
  try {
    const { data, error } = await supabase
      .from('wish_requests')
      .select('*')
      .limit(10);
    
    if (error) {
      console.error('   ❌ 查詢失敗:', error.message);
    } else {
      console.log(`   ✅ 查詢成功，找到 ${data?.length || 0} 筆資料`);
      if (data && data.length > 0) {
        console.log('   📋 第一筆資料:', {
          id: data[0].id,
          title: data[0].title,
          status: data[0].status,
          created_at: data[0].created_at,
        });
      }
      results.wishRequests = true;
    }
  } catch (err) {
    console.error('   ❌ 錯誤:', err.message);
  }

  // 3. 測試 trips 表
  console.log('\n3️⃣ 測試 trips 表...');
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .limit(10);
    
    if (error) {
      console.error('   ❌ 查詢失敗:', error.message);
    } else {
      console.log(`   ✅ 查詢成功，找到 ${data?.length || 0} 筆資料`);
      if (data && data.length > 0) {
        console.log('   📋 第一筆資料:', {
          id: data[0].id,
          destination: data[0].destination,
          date: data[0].date,
          shopper_name: data[0].shopper_name,
        });
      }
      results.trips = true;
    }
  } catch (err) {
    console.error('   ❌ 錯誤:', err.message);
  }

  // 4. 測試 profiles 表
  console.log('\n4️⃣ 測試 profiles 表...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('   ❌ 查詢失敗:', error.message);
    } else {
      console.log(`   ✅ 查詢成功，找到 ${data?.length || 0} 個使用者`);
      results.profiles = true;
    }
  } catch (err) {
    console.error('   ❌ 錯誤:', err.message);
  }

  // 5. 測試多次連續查詢（模擬頁面載入）
  console.log('\n5️⃣ 測試連續查詢穩定性（5 次）...');
  let successCount = 0;
  for (let i = 0; i < 5; i++) {
    try {
      const { data, error } = await supabase
        .from('wish_requests')
        .select('count', { count: 'exact', head: true });
      
      if (!error) {
        successCount++;
        process.stdout.write('   ✅');
      } else {
        process.stdout.write('   ❌');
      }
    } catch (err) {
      process.stdout.write('   ❌');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.log(`\n   成功率: ${successCount}/5 (${(successCount/5*100).toFixed(0)}%)`);

  // 總結
  console.log('\n' + '='.repeat(50));
  console.log('📊 診斷結果總結:');
  console.log('='.repeat(50));
  console.log(`基本連接: ${results.connection ? '✅ 正常' : '❌ 失敗'}`);
  console.log(`許願單表: ${results.wishRequests ? '✅ 正常' : '❌ 失敗'}`);
  console.log(`行程表:   ${results.trips ? '✅ 正常' : '❌ 失敗'}`);
  console.log(`使用者表: ${results.profiles ? '✅ 正常' : '❌ 失敗'}`);
  console.log(`穩定性:   ${successCount >= 4 ? '✅ 穩定' : '⚠️ 不穩定'}`);

  if (results.rlsIssue) {
    console.log('\n🚨 檢測到 RLS 權限問題！');
    console.log('   請在 Supabase SQL Editor 執行以下 SQL：\n');
    console.log('   ALTER TABLE wish_requests DISABLE ROW LEVEL SECURITY;');
    console.log('   ALTER TABLE trips DISABLE ROW LEVEL SECURITY;');
    console.log('   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;');
    console.log('   \n   GRANT ALL ON wish_requests TO anon, authenticated;');
    console.log('   GRANT ALL ON trips TO anon, authenticated;');
    console.log('   GRANT ALL ON profiles TO anon, authenticated;\n');
  }

  if (!results.wishRequests && !results.trips) {
    console.log('\n⚠️ 資料表可能不存在或無權限存取');
    console.log('   請確認已在 Supabase 執行 database-schema.sql');
  }

  if (successCount < 4) {
    console.log('\n⚠️ 連接不穩定，可能是網路問題或 Supabase 區域延遲');
  }

  console.log('\n✅ 診斷完成！\n');
}

diagnose().catch(console.error);

