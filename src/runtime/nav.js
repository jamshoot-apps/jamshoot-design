/*
 * Mobile navigation and the optional scroll-away header. The nav is a disclosure
 * inside the header, not a modal over the page.
 */

(() => {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = toggle && document.getElementById(toggle.getAttribute('aria-controls'));

  if (!nav) {
    return;
  }

  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    nav.removeAttribute('data-open');
  };

  // The wrapper hides the button on desktop; it must not leave a mobile menu open.
  window.addEventListener('resize', () => {
    if (!toggle.getClientRects().length) close();
  });

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.toggleAttribute('data-open', !open);
  });

  // Following an in-page link leaves the menu standing over the target otherwise.
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      close();
    }
  });

  // Escape closes an open menu. Focus inside it would otherwise stay on a hidden link.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
    if (toggle.getAttribute('aria-expanded') !== 'true') return;

    const focusInMenu = nav.contains(document.activeElement) || document.activeElement === toggle;
    close();
    if (focusInMenu) toggle.focus();
  });
})();

(() => {
  const header = document.querySelector('[data-hide-on-scroll]');

  if (!header) return;

  const position = () => Math.max(0, Math.min(window.scrollY, document.documentElement.scrollHeight - window.innerHeight));
  let previous = position();
  let distance = 0;
  let queued = false;

  const reveal = () => {
    header.removeAttribute('data-scroll-hidden');
    previous = position();
    distance = 0;
  };

  header.addEventListener('focusin', reveal);
  window.addEventListener('pageshow', reveal);
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;

    window.requestAnimationFrame(() => {
      queued = false;
      const current = position();
      const delta = current - previous;
      previous = current;

      if (current <= header.offsetHeight || header.contains(document.activeElement) || header.querySelector('[data-open]')) {
        reveal();
        return;
      }

      // Accumulate small movements, resetting at a direction change to avoid jitter.
      distance = Math.sign(delta) === Math.sign(distance) ? distance + delta : delta;
      if (Math.abs(distance) < 8) return;
      header.toggleAttribute('data-scroll-hidden', distance > 0);
      distance = 0;
    });
  }, { passive: true });
})();
