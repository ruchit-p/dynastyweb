export {};

declare global {
  interface Window {
    /** Google Analytics gtag function injected via GA script */
    gtag?: (...args: unknown[]) => void;
  }
} 