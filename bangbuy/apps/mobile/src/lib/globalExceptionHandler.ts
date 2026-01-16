import { Alert, BackHandler } from 'react-native';
import * as Updates from 'expo-updates';

// Define the error handler type
type GlobalErrorHandler = (error: Error, isFatal?: boolean) => void;

// Function to handle soft restart
const performSoftRestart = async () => {
  try {
    await Updates.reloadAsync();
  } catch (e) {
    // If reload fails (e.g. in dev mode without expo-updates configured), 
    // fall back to alerting the user to restart manually.
    Alert.alert(
      "Critical Error",
      "The app encountered a fatal error and could not automatically restart. Please force close and reopen the app."
    );
  }
};

export const initializeGlobalExceptionHandler = () => {
  // 1. Global JS Exception Handler (ErrorUtils)
  const defaultErrorHandler = (global as any).ErrorUtils.getGlobalHandler();

  const globalErrorHandler: GlobalErrorHandler = async (error, isFatal) => {
    console.error('[GlobalExceptionHandler] Caught fatal JS error:', error);

    // If it's not fatal, just log it (or send to crash reporting service) and let default handler work if needed
    if (!isFatal) {
        // Optional: Call default handler if you want red screen in dev
        // defaultErrorHandler(error, isFatal);
        return;
    }

    // If Fatal:
    // Prevent default red screen in production (or native crash behavior)
    // Show an alert and restart
    Alert.alert(
      "Unexpected Error",
      "We encountered a critical error. The app will restart now.",
      [
        {
          text: "Restart",
          onPress: () => {
            performSoftRestart();
          },
        },
      ]
    );
  };

  (global as any).ErrorUtils.setGlobalHandler(globalErrorHandler);


  // 2. Unhandled Promise Rejections
  // "promise/setimmediate/rejection-tracking" is the standard RN way to track this
  try {
    const tracking = require('promise/setimmediate/rejection-tracking');
    tracking.enable({
      allRejections: true,
      onUnhandled: (id: string, error: Error) => {
        console.error('[GlobalExceptionHandler] Unhandled Promise Rejection:', id, error);
        
        // Decide if we want to restart on unhandled promises. 
        // Often these are "undefined is not a function" in async code.
        // For safety, we can alert the user if it seems critical, or just log it.
        // For now, let's treat strictly "undefined is not a function" as critical enough to warn.
        
        const msg = error?.message || '';
        if (msg.includes('undefined is not a function') || msg.includes('evaluate directly')) {
             Alert.alert(
              "Application Error",
              "A critical async error occurred. We recommend restarting.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Restart", onPress: () => performSoftRestart() }
              ]
            );
        }
      },
      onHandled: (id: string) => {
        console.log(`[GlobalExceptionHandler] Promise Rejection Handled: ${id}`);
      },
    });
  } catch (e) {
    console.warn('[GlobalExceptionHandler] Failed to initialize promise rejection tracking:', e);
  }
};
