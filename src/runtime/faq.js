/*
 * Deep links into an FAQ, and the only part of this component markup cannot do.
 *
 * A question opens on click with no JavaScript at all — that is what `<details>` is
 * for, and it is why the component uses it. What `<details>` does not do is open
 * because it is the target of a fragment: the HTML rule that reveals a hidden target
 * only opens a details whose *descendant* was linked to, and the anchor here is the
 * item itself, so a link to `#refunds` scrolls to a question still closed.
 *
 * CSS can reach `:target`, but a `:target` rule forcing the panel open could never be
 * closed again — the element stays the target after the click — so the behavior that
 * belongs to a reader's click cannot be written as a style.
 *
 * Without this module the link still lands on the right question. With it, the answer
 * is open when the reader arrives.
 */

(() => {
  const open = () => {
    let id = '';

    /* A hand-typed or truncated escape (`#%`) throws rather than naming nothing. */
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }

    const item = id && document.getElementById(id)?.closest('details');

    if (item) {
      item.open = true;
    }
  };

  open();
  addEventListener('hashchange', open);
})();
