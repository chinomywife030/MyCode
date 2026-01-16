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
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (url && key) {
      this.client = createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });
      this._isConfigured = true;
      console.log('[SupabaseService] Initialized successfully.');
    } else {
      console.warn('[SupabaseService] ⚠️ Missing Environment Variables. Running in Fallback Mode.');
      // Initialize with dummy values so the app doesn't crash on `supabase.from(...)`
      // Calls will simply fail with 404 or network errors, which the app handles safeley.
      this.client = createClient('https://placeholder.supabase.co', 'placeholder-key', {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
      this._isConfigured = false;
    }
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
