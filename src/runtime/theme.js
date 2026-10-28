/*
 * The theme control. The second and last piece of JavaScript the library ships, and
 * it knows the name of no theme: the states are the options the control renders, in
 * the order it renders them, and the value of each one is what goes on <html>.
 *
 * That is deliberate. A site adds a palette by adding a file, and nothing in the
 * browser has to be told — this module cycles whatever the page was built with. The
 * empty value is "follow the system", which is the absence of the attribute for the
 * same reason it is the absence of a stored choice.
 *
 * The stored choice is already applied by the time this runs: `src/theme.js` puts a
 * line in the head that sets the attribute before the first paint, so a reader who
 * chose light never watches a dark page flash past.
 */

(() => {
  const control = document.querySelector('[data-theme-toggle]');

  if (!control) {
    return;
  }

  const root = document.documentElement;
  const options = [...control.querySelectorAll('[data-theme-option]')];
  const key = 'ds-theme';

  /*
   * Storage can be refused — a private window, a blocked frame — and a control that
   * threw there would take the rest of the page's scripts with it. A reader in that
   * browser still switches; the page just does not remember afterwards.
   */
  const stored = () => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const remember = (name) => {
    try {
      if (name) {
        localStorage.setItem(key, name);
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      /* Not remembering is the whole cost. */
    }
  };

  const show = (option) => {
    for (const other of options) {
      other.toggleAttribute('data-active', other === option);
    }

    const name = option.getAttribute('data-theme-option');

    if (name) {
      root.setAttribute('data-theme', name);
    } else {
      root.removeAttribute('data-theme');
    }
  };

  /*
   * A stored theme the page no longer has — a palette the site deleted — falls back
   * to the first option rather than leaving an attribute nothing answers to.
   */
  const chosen = stored();
  show(options.find((option) => option.getAttribute('data-theme-option') === chosen) ?? options[0]);

  control.addEventListener('click', () => {
    const current = options.findIndex((option) => option.hasAttribute('data-active'));
    const next = options[(current + 1) % options.length];

    remember(next.getAttribute('data-theme-option'));
    show(next);
  });
})();
