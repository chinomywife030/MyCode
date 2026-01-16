import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ==================================================================================
 * THE FOUNDATION: Robust Singleton Pattern for Supabase
 * ==================================================================================
 * 
 * Objectives:
 * 1. Never Crash on Import (No top-level throw).
 * 2. Self-Healing / Safe Fallback (Returns a dummy client if config is missing).
 * 3. Centralized Validation (Exposes `isConfigured` method for Layout checks).
 */
class SupabaseService {
  private static instance: SupabaseService;
  public client: SupabaseClient;
  private _isConfigured: boolean = false;

  private constructor() {
    // 1. Prioritize EXPO_PUBLIC_ vars (Standard for Expo 49+)
    // 2. Note: process.env.EXPO_PUBLIC_* is statically replaced by Babel at build time.
    //    We explicitly access them to ensure the bundler picks them up.
    const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    // 3. Robust Sanitization (Trim whitespace/newlines which cause "Invalid API Key")
    const url = rawUrl.trim();
    const key = rawKey.trim();

    // 4. Safe Diagnostic Logging (Never log full secrets!)
    console.log('[SupabaseService] Initializing...');
    console.log(`[SupabaseService] URL provided: ${!!url} (Length: ${url.length})`);
    console.log(`[SupabaseService] Key provided: ${!!key} (Length: ${key.length})`);

    if (key.length > 5) {
      console.log(`[SupabaseService] Key Prefix: ${key.substring(0, 5)}...`);
    }

    if (url && key) {
      try {
        this.client = createClient(url, key, {
          auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
        });
        this._isConfigured = true;
        console.log('[SupabaseService] Client created successfully.');
      } catch (e) {
        console.error('[SupabaseService] Client creation failed:', e);
        // Fallback below
        this._isConfigured = false;
        this.client = this.createFallbackClient();
      }
    } else {
      console.warn('[SupabaseService] ⚠️ Missing Environment Variables. Running in Fallback Mode.');
      this.client = this.createFallbackClient();
      this._isConfigured = false;
    }
  }

  private createFallbackClient(): SupabaseClient {
    return createClient('https://placeholder.supabase.co', 'placeholder-key-for-ui-safety', {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public isConfigured(): boolean {
    return this._isConfigured;
  }
}

// Export the prompt-ready Singleton Instance
export const supabaseService = SupabaseService.getInstance();
export const supabase = supabaseService.client;
