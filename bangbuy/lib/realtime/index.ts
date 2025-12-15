/**
 * 🔌 Realtime Module
 * 
 * 簡化版 Supabase Realtime 管理
 */

export {
  useSimpleRealtime,
  cleanupAllChannels,
  type SimpleRealtimeStatus,
} from './simpleRealtime';

// 向後兼容的別名
export { useSimpleRealtime as useRealtimeChannel } from './simpleRealtime';
export type { SimpleRealtimeStatus as ChannelStatus } from './simpleRealtime';
