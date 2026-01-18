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

    // 3. Helper to sanitize input (Strip quotes ' " and trim whitespace/newlines)
    const sanitize = (str: string) => str.replace(/^['"]|['"]$/g, '').trim();

    const url = sanitize(rawUrl);
    const key = sanitize(rawKey);

    // 4. Safe Diagnostic Logging (Never log full secrets!)
    console.log('[SupabaseService] Initializing...');

    // Determine which env var was used for logging purposes
    let envVarName = 'UNKNOWN';
    if (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) envVarName = 'EXPO_PUBLIC_SUPABASE_ANON_KEY';
    else if (process.env.SUPABASE_ANON_KEY) envVarName = 'SUPABASE_ANON_KEY';

    if (key) {
      console.log(`[SupabaseService] Key Source: ${envVarName}`);
      console.log(`[SupabaseService] Key Length: ${key.length}`);

      const hasWhitespace = /\s/.test(key);
      console.log(`[SupabaseService] Contains Whitespace/Newlines: ${hasWhitespace}`);

      if (key.length > 0) {
        console.log(`[SupabaseService] Key First Char: ${key.charAt(0)}`);
        console.log(`[SupabaseService] Key Last Char Code: ${key.charCodeAt(key.length - 1)}`);
      }
      // Safety: Only log a safe prefix
      console.log(`[SupabaseService] Key Prefix: ${key.substring(0, 5)}...`);
    } else {
      console.error('[SupabaseService] ❌ Key is EMPTY after sanitization!');
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
