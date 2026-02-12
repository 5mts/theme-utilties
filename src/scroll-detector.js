/**
 * Scroll Detector
 * Adds scroll-related state to an element via data attributes or classes.
 */

const defaults = {
  // Thresholds
  hideAfterPx: 120,       // don't change scroll-dir to 'down' until scrolled this far
  upIntentPx: 42,         // upward travel required before revealing (prevents jitter)
  downIntentPx: 42,       // downward travel required before hiding (prevents jitter)
  minDeltaPx: 20,          // ignore tiny movements
  edgeThresholdPx: 50,    // distance from top/bottom for at-top/at-bottom
  zoneThreshold: 0.5,     // viewport fraction for near-top/near-bottom

  // Features (set to false to disable)
  scrollDir: true,
  departingTop: true,
  atTop: true,
  atBottom: true,
  nearTop: true,
  nearBottom: true,

  // Output mode: 'data' for data-attributes, 'class' for classes
  mode: 'data',

  // Target element (defaults to <html>)
  target: null,
};

/**
 * Initialize scroll detection
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function to remove listener and attributes
 */
export function initScrollDetector(options = {}) {
  const cfg = { ...defaults, ...options };
  const root = cfg.target || document.documentElement;

  let lastY = window.scrollY || 0;
  let upIntentAccum = 0;
  let downIntentAccum = 0;
  let ticking = false;
  let currentScrollDir = 'up';
  let hasBeenRevealed = false;
  let wasAtTop = lastY <= 0;

  const getScrollHeight = () => Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );

  // Helper to set state (handles both data attributes and classes)
  const setState = (name, value) => {
    if (cfg.mode === 'class') {
      if (typeof value === 'boolean') {
        root.classList.toggle(name, value);
      } else {
        // For scrollDir: remove old class, add new one
        root.classList.remove(`${name}-up`, `${name}-down`);
        root.classList.add(`${name}-${value}`);
      }
    } else {
      // Data attribute mode
      const attrName = name.replace(/([A-Z])/g, '-$1').toLowerCase();
      if (typeof value === 'boolean') {
        root.dataset[name] = value ? '1' : '0';
      } else {
        root.dataset[name] = value;
      }
    }
  };

  // Helper to remove state
  const removeState = (name) => {
    if (cfg.mode === 'class') {
      root.classList.remove(name, `${name}-up`, `${name}-down`);
    } else {
      delete root.dataset[name];
    }
  };

  const update = () => {
    ticking = false;

    const y = window.scrollY || 0;
    const delta = y - lastY;
    const viewportHeight = window.innerHeight;
    const scrollHeight = getScrollHeight();
    const maxScroll = scrollHeight - viewportHeight;
    const zoneThresholdPx = viewportHeight * cfg.zoneThreshold;

    // Track reaching the top (before minDelta filter so small arrivals register)
    if (y <= 0) wasAtTop = true;

    // Ignore tiny movement / jitter
    if (Math.abs(delta) < cfg.minDeltaPx) return;

    // Leaving the top going down — reset so this departure is instant
    if (wasAtTop && delta > 0) {
      hasBeenRevealed = false;
      wasAtTop = false;
    }

    const dir = delta > 0 ? 'down' : 'up';

    // Direction with intent detection
    if (cfg.scrollDir) {
      if (dir === 'up') {
        downIntentAccum = 0;
        upIntentAccum += Math.abs(delta);
        if (upIntentAccum >= cfg.upIntentPx) {
          if (currentScrollDir !== 'up') {
            currentScrollDir = 'up';
            hasBeenRevealed = true;
          }
          setState('scrollDir', 'up');
        }
      } else {
        upIntentAccum = 0;
        if (y > cfg.hideAfterPx) {
          downIntentAccum += Math.abs(delta);
          if (downIntentAccum >= cfg.downIntentPx) {
            if (currentScrollDir !== 'down') {
              currentScrollDir = 'down';
            }
            setState('scrollDir', 'down');
          }
        } else {
          downIntentAccum = 0;
          setState('scrollDir', 'up');
        }
      }
    }

    // Departing top: true until the menu has been revealed by scrolling up
    if (cfg.departingTop) {
      setState('departingTop', !hasBeenRevealed);
    }

    // Position: at top or bottom edge
    if (cfg.atTop) {
      setState('atTop', y <= cfg.edgeThresholdPx);
    }
    if (cfg.atBottom) {
      setState('atBottom', y >= maxScroll - cfg.edgeThresholdPx);
    }

    // Zone: within threshold of top or bottom
    if (cfg.nearTop) {
      setState('nearTop', y < zoneThresholdPx);
    }
    if (cfg.nearBottom) {
      setState('nearBottom', y > maxScroll - zoneThresholdPx);
    }

    lastY = y;
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  const init = () => {
    const y = window.scrollY || 0;
    const viewportHeight = window.innerHeight;
    const scrollHeight = getScrollHeight();
    const maxScroll = scrollHeight - viewportHeight;
    const zoneThresholdPx = viewportHeight * cfg.zoneThreshold;

    if (cfg.scrollDir) setState('scrollDir', 'up');
    if (cfg.departingTop) setState('departingTop', true);
    if (cfg.atTop) setState('atTop', y <= cfg.edgeThresholdPx);
    if (cfg.atBottom) setState('atBottom', y >= maxScroll - cfg.edgeThresholdPx);
    if (cfg.nearTop) setState('nearTop', y < zoneThresholdPx);
    if (cfg.nearBottom) setState('nearBottom', y > maxScroll - zoneThresholdPx);
  };

  // Set up
  document.addEventListener('scroll', onScroll, { passive: true });
  init();

  // Return cleanup function
  return function destroy() {
    document.removeEventListener('scroll', onScroll);
    if (cfg.scrollDir) removeState('scrollDir');
    if (cfg.departingTop) removeState('departingTop');
    if (cfg.atTop) removeState('atTop');
    if (cfg.atBottom) removeState('atBottom');
    if (cfg.nearTop) removeState('nearTop');
    if (cfg.nearBottom) removeState('nearBottom');
  };
}
