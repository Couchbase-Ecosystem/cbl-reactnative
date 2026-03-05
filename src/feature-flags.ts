/**
 * Feature flag for Turbo Modules prototype
 *
 * Set to true to use Turbo Modules
 * Set to false to use Legacy Bridge
 *
 * This allows easy A/B testing for performance comparison
 */

export const USE_TURBO_MODULES = (() => {
  const ENABLE_TURBO = true;

  if (__DEV__) {
    console.log(`
=============================
  CBL Mode: ${ENABLE_TURBO ? 'TURBO MODULES ' : 'LEGACY BRIDGE  '}  
=============================
    `);
  }

  return ENABLE_TURBO;
})();
