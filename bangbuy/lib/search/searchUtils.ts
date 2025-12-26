/**
 * 🔍 搜尋工具函數
 * 
 * - 中文/英文 tokenize（2-gram 切分）
 * - 模糊比對（Levenshtein distance）
 * - 欄位權重計分
 * - 高亮標記
 */

// ========== 欄位權重 ==========
export const FIELD_WEIGHTS = {
  title: 3.0,
  destination: 2.0,
  category: 1.5,
  tags: 1.5,
  description: 1.0,
} as const;

// ========== 比對分數 ==========
const MATCH_SCORES = {
  exact: 1.0,      // 完全包含
  prefix: 0.8,     // 前綴匹配
  fuzzy: 0.5,      // 模糊匹配
} as const;

// ========== 搜尋索引類型 ==========
export interface SearchableItem {
  id: string;
  title?: string;
  destination?: string;
  category?: string;
  tags?: string[];
  description?: string;
  [key: string]: any;
}

export interface SearchIndex {
  item: SearchableItem;
  fields: {
    title: string;
    destination: string;
    category: string;
    tags: string;
    description: string;
  };
}

export interface SearchResult<T> {
  item: T;
  score: number;
  highlights: {
    title?: string;
    destination?: string;
    description?: string;
  };
}

// ========== Tokenize 函數 ==========

/**
 * 判斷字元是否為中文
 */
function isChinese(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x4e00 && code <= 0x9fff;
}

/**
 * 判斷字串是否主要為中文
 */
function isPrimarilyChinese(str: string): boolean {
  let chineseCount = 0;
  for (const char of str) {
    if (isChinese(char)) chineseCount++;
  }
  return chineseCount > str.length / 2;
}

/**
 * 2-gram 切分（中文）
 */
function bigramSplit(str: string): string[] {
  const tokens: string[] = [];
  const cleaned = str.replace(/\s+/g, '');
  
  if (cleaned.length <= 2) {
    tokens.push(cleaned);
  } else {
    for (let i = 0; i < cleaned.length - 1; i++) {
      tokens.push(cleaned.slice(i, i + 2));
    }
  }
  
  return tokens;
}

/**
 * Tokenize 搜尋詞
 * - 英文：空白切分
 * - 中文：2-gram 切分
 */
export function tokenize(query: string): string[] {
  if (!query) return [];
  
  const normalized = query.trim().toLowerCase();
  const tokens: string[] = [];
  
  // 用空白切分
  const parts = normalized.split(/\s+/).filter(Boolean);
  
  for (const part of parts) {
    if (isPrimarilyChinese(part)) {
      // 中文：2-gram 切分
      tokens.push(...bigramSplit(part));
    } else {
      // 英文：保留原始 token（過濾長度 1 的）
      if (part.length > 1) {
        tokens.push(part);
      }
    }
  }
  
  // 去重
  return [...new Set(tokens)];
}

// ========== 模糊比對（Levenshtein Distance）==========

/**
 * 計算編輯距離（簡化版，避免效能問題）
 */
function levenshteinDistance(s1: string, s2: string): number {
  // 長度差太大直接返回大值
  if (Math.abs(s1.length - s2.length) > 2) {
    return 999;
  }
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  // 限制長度避免效能問題
  if (len1 > 20 || len2 > 20) {
    return s1.includes(s2) || s2.includes(s1) ? 0 : 999;
  }
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // 刪除
        matrix[i][j - 1] + 1,      // 插入
        matrix[i - 1][j - 1] + cost // 替換
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * 檢查是否為模糊匹配
 * - 英文：token 長度 >= 4，允許 edit distance <= 1
 * - 中文：token 長度 >= 2，允許 edit distance <= 1
 */
function isFuzzyMatch(token: string, text: string): boolean {
  const minLength = isPrimarilyChinese(token) ? 2 : 4;
  
  if (token.length < minLength) {
    return false;
  }
  
  // 對 text 的每個子串檢查
  const maxDistance = 1;
  
  for (let i = 0; i <= text.length - token.length + maxDistance; i++) {
    const substr = text.slice(i, i + token.length + maxDistance);
    const distance = levenshteinDistance(token, substr);
    if (distance <= maxDistance) {
      return true;
    }
  }
  
  return false;
}

// ========== 計分函數 ==========

/**
 * 計算單一 token 對單一欄位的分數
 */
function scoreTokenOnField(token: string, fieldValue: string): number {
  if (!token || !fieldValue) return 0;
  
  const lowerField = fieldValue.toLowerCase();
  
  // Exact 包含
  if (lowerField.includes(token)) {
    return MATCH_SCORES.exact;
  }
  
  // Prefix 匹配
  if (lowerField.startsWith(token)) {
    return MATCH_SCORES.prefix;
  }
  
  // Fuzzy 匹配（有條件啟用）
  if (isFuzzyMatch(token, lowerField)) {
    return MATCH_SCORES.fuzzy;
  }
  
  return 0;
}

/**
 * 計算所有 tokens 對單一 item 的總分
 */
export function scoreItem(
  item: SearchIndex,
  tokens: string[]
): number {
  if (tokens.length === 0) return 0;
  
  let totalScore = 0;
  
  for (const token of tokens) {
    // title
    totalScore += scoreTokenOnField(token, item.fields.title) * FIELD_WEIGHTS.title;
    
    // destination
    totalScore += scoreTokenOnField(token, item.fields.destination) * FIELD_WEIGHTS.destination;
    
    // category
    totalScore += scoreTokenOnField(token, item.fields.category) * FIELD_WEIGHTS.category;
    
    // tags
    totalScore += scoreTokenOnField(token, item.fields.tags) * FIELD_WEIGHTS.tags;
    
    // description
    totalScore += scoreTokenOnField(token, item.fields.description) * FIELD_WEIGHTS.description;
  }
  
  return totalScore;
}

// ========== 索引建立 ==========

/**
 * 建立搜尋索引
 */
export function buildSearchIndex<T extends SearchableItem>(items: T[]): SearchIndex[] {
  return items.map(item => ({
    item,
    fields: {
      title: (item.title || '').toLowerCase(),
      destination: (item.destination || '').toLowerCase(),
      category: (item.category || '').toLowerCase(),
      tags: (item.tags || []).join(' ').toLowerCase(),
      description: (item.description || '').toLowerCase(),
    },
  }));
}

// ========== 主搜尋函數 ==========

export interface SearchOptions {
  q: string;
  destination?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc';
}

/**
 * 執行搜尋
 */
export function searchItems<T extends SearchableItem>(
  index: SearchIndex[],
  options: SearchOptions
): SearchResult<T>[] {
  const { q, destination, category, priceMin, priceMax, dateFrom, dateTo, status, sort } = options;
  
  const tokens = tokenize(q);
  const hasQuery = tokens.length > 0;
  
  let results: SearchResult<T>[] = [];
  
  for (const indexItem of index) {
    const item = indexItem.item as T;
    
    // ===== Filter 條件 =====
    
    // destination filter
    if (destination) {
      const itemDest = (item.destination || '').toLowerCase();
      if (!itemDest.includes(destination.toLowerCase())) {
        continue;
      }
    }
    
    // category filter
    if (category && item.category !== category) {
      continue;
    }
    
    // price filter
    const price = item.price || item.budget || 0;
    if (priceMin !== undefined && price < priceMin) continue;
    if (priceMax !== undefined && price > priceMax) continue;
    
    // date filter
    const itemDate = item.date || item.created_at || '';
    if (dateFrom && itemDate < dateFrom) continue;
    if (dateTo && itemDate > dateTo) continue;
    
    // status filter
    if (status && item.status !== status) continue;
    
    // ===== 計分 =====
    
    let score = 0;
    
    if (hasQuery) {
      score = scoreItem(indexItem, tokens);
      
      // 沒有匹配的跳過
      if (score === 0) continue;
    } else {
      // 沒有 query 時給予基本分數
      score = 1;
    }
    
    // ===== 高亮 =====
    
    const highlights = hasQuery ? generateHighlights(item, tokens) : {};
    
    results.push({
      item,
      score,
      highlights,
    });
  }
  
  // ===== 排序 =====
  
  const sortBy = sort || (hasQuery ? 'relevance' : 'newest');
  
  switch (sortBy) {
    case 'relevance':
      // 分數高到低（stable sort）
      results.sort((a, b) => b.score - a.score);
      break;
    case 'newest':
      results.sort((a, b) => {
        const dateA = a.item.created_at || a.item.date || '';
        const dateB = b.item.created_at || b.item.date || '';
        return dateB.localeCompare(dateA);
      });
      break;
    case 'price_asc':
      results.sort((a, b) => {
        const priceA = a.item.price || a.item.budget || 0;
        const priceB = b.item.price || b.item.budget || 0;
        return priceA - priceB;
      });
      break;
    case 'price_desc':
      results.sort((a, b) => {
        const priceA = a.item.price || a.item.budget || 0;
        const priceB = b.item.price || b.item.budget || 0;
        return priceB - priceA;
      });
      break;
  }
  
  return results;
}

// ========== 高亮函數 ==========

/**
 * 生成高亮文字
 */
function generateHighlights(
  item: SearchableItem,
  tokens: string[]
): { title?: string; destination?: string; description?: string } {
  const highlights: { title?: string; destination?: string; description?: string } = {};
  
  if (item.title) {
    highlights.title = highlightText(item.title, tokens);
  }
  
  if (item.destination) {
    highlights.destination = highlightText(item.destination, tokens);
  }
  
  if (item.description) {
    highlights.description = highlightText(item.description, tokens);
  }
  
  return highlights;
}

/**
 * 在文字中標記匹配的 token
 * 返回帶有 <mark> 標籤的 HTML
 */
export function highlightText(text: string, tokens: string[]): string {
  if (!text || tokens.length === 0) return text;
  
  let result = text;
  
  // 對每個 token 進行標記
  for (const token of tokens) {
    // 建立 case-insensitive regex
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedToken})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  }
  
  return result;
}

/**
 * 清理高亮 HTML（用於純文字顯示）
 */
export function stripHighlights(html: string): string {
  return html.replace(/<\/?mark>/g, '');
}














