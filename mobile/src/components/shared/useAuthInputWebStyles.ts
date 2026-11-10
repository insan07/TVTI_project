import { useEffect } from 'react';
import { Platform } from 'react-native';

export function useAuthInputWebStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    // Clear the previous global white autofill paint during Fast Refresh too.
    document.getElementById('lms-autofill-styles')?.remove();
    if (document.getElementById('auth-input-web-styles')) return;

    const style = document.createElement('style');
    style.id = 'auth-input-web-styles';
    style.textContent = `
      [data-auth-input="true"] {
        background-color: transparent !important;
      }
      [data-auth-input="true"]:autofill {
        background-clip: text !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: currentColor !important;
        caret-color: currentColor !important;
        box-shadow: none !important;
      }
      [data-auth-input="true"]:-webkit-autofill,
      [data-auth-input="true"]:-webkit-autofill:hover,
      [data-auth-input="true"]:-webkit-autofill:focus,
      [data-auth-input="true"]:-webkit-autofill:active {
        background-clip: text !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: currentColor !important;
        caret-color: currentColor !important;
        -webkit-box-shadow: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
  }, []);
}
