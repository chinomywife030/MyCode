/**
 * Debug utility to track component mounting/unmounting
 * Usage:
 *   import { useDebugMount } from '@/src/lib/debugMount';
 *   useDebugMount('ComponentName');
 */
import { useEffect, useRef } from 'react';

export function useDebugMount(componentName: string, extraData?: any) {
  useEffect(() => {
    if (__DEV__) {
      console.log(`[Mount] 🟢 ${componentName} mounted`, extraData ? extraData : '');
    }
    
    return () => {
      if (__DEV__) {
        console.log(`[Mount] 🔴 ${componentName} unmounted`);
      }
    };
  }, []);
}

export function log(tag: string, message: string, data?: any) {
  if (__DEV__) {
    console.log(`[${tag}] ${message}`, data ? data : '');
  }
}
