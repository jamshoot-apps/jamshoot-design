// Keep the static documentation sidebar in place across full-page navigation.
(() => {
  const nav = document.querySelector('.docs__nav');
  if (!nav) return;

  const desktop = window.matchMedia('(min-width: 64rem)');
  const key = `jamshoot-docs:sidebar:${new URL('.', window.location.href).pathname}`;
  const restore = () => {
    if (!desktop.matches) return;
    try {
      const saved = window.sessionStorage.getItem(key);
      const top = Number(saved);
      if (saved !== null && Number.isFinite(top) && top >= 0) nav.scrollTop = top;
    } catch {
      // Navigation still works when browser storage is unavailable.
    }
  };
  const save = () => {
    if (!desktop.matches) return;
    try {
      window.sessionStorage.setItem(key, String(nav.scrollTop));
    } catch {
      // Storage is optional; never interrupt a documentation link.
    }
  };

  restore();
  nav.addEventListener('scroll', save, { passive: true });
  window.addEventListener('pagehide', save);
  window.addEventListener('pageshow', restore);
  desktop.addEventListener('change', restore);
})();
