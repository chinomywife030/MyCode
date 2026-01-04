/**
 * Messaging 模組 - 使用 @bangbuy/core
 * 
 * 這個檔案是 @bangbuy/core/messaging 的 re-export
 */

import { ensureCoreInitialized } from './core';
import {
  getConversations as coreGetConversations,
  getMessages as coreGetMessages,
  sendMessage as coreSendMessage,
  getOrCreateConversation as coreGetOrCreateConversation,
  markAsRead as coreMarkAsRead,
  blockUser as coreBlockUser,
  unblockUser as coreUnblockUser,
  type Conversation,
  type Message,
  type SendMessageParams,
  type SendMessageResult,
  type GetOrCreateConversationParams,
  type GetOrCreateConversationResult,
} from '@bangbuy/core';

// 確保 core 已初始化
ensureCoreInitialized();

// Re-export types
export type {
  Conversation,
  Message,
  SendMessageParams,
  SendMessageResult,
  GetOrCreateConversationParams,
  GetOrCreateConversationResult,
};

/**
 * 獲取對話列表
 */
export async function getConversations(options?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<Conversation[]> {
  ensureCoreInitialized();
  return coreGetConversations(options);
}

/**
 * 獲取對話的訊息列表
 */
export async function getMessages(
  conversationId: string,
  options?: {
    limit?: number;
    before?: string;
  }
): Promise<Message[]> {
  ensureCoreInitialized();
  return coreGetMessages(conversationId, options);
}

/**
 * 發送訊息
 */
export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  ensureCoreInitialized();
  return coreSendMessage(params);
}

/**
 * 取得或建立對話
 */
export async function getOrCreateConversation(
  params: GetOrCreateConversationParams
): Promise<GetOrCreateConversationResult> {
  ensureCoreInitialized();
  return coreGetOrCreateConversation(params);
}

/**
 * 標記對話為已讀
 */
export async function markAsRead(conversationId: string): Promise<boolean> {
  ensureCoreInitialized();
  return coreMarkAsRead(conversationId);
}

/**
 * 封鎖用戶
 */
export async function blockUser(
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  ensureCoreInitialized();
  return coreBlockUser(userId, reason);
}

/**
 * 解除封鎖用戶
 */
export async function unblockUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  ensureCoreInitialized();
  return coreUnblockUser(userId);
}




