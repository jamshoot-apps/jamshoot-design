import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';
import { inlineIcon } from '../../../icons.js';

/**
 * One button holding every choice, with the one in force drawn and the rest not.
 *
 * The component knows nothing about what a theme is: it is handed a list, renders it
 * in order, and the value it writes on each option is the value that goes on <html>.
 * `src/themes.js` builds that list out of the site's palette files, so a site adds a
 * palette by adding a file and this component needs no edit — which is the same
 * reason `src/runtime/theme.js` reads its states back out of this markup.
 *
 * Rendered this way the control is correct before any JavaScript runs: the page ships
 * with the first choice active, and the first choice is the one that stores nothing.
 * The other options are `display: none`, so the button's accessible name is the state
 * it is in, with nothing to announce separately.
 *
 * The name says what one click does as well — "Theme: Dark. Switch to Light." A name
 * that is only the state leaves a reader who cannot see the icon with no way to tell
 * whether "Theme: Dark" is the theme they have or the theme they would get, which is
 * the one thing a control must never be ambiguous about. The next state is knowable
 * because `choices` is in cycle order, so nothing has to be told twice.
 */
export const themeToggle = defineComponent('themeToggle', {
  summary: 'The control that moves a reader between a site’s palettes.',
  docs: 'src/components/atoms/themeToggle/README.md',
  runtime: ['theme'],
  options: {
    label: { type: 'text', default: 'Theme', summary: 'What the control is called, read before the state it is in.' },
    action: {
      type: 'text',
      default: 'Switch to',
      summary: 'Read after the state, with the next palette’s name after it: what one click does.',
    },
    choices: {
      type: 'items',
      required: true,
      summary: 'The states, in the order one click moves through them.',
      of: {
        palette: {
          type: 'id',
          summary: 'The palette this choice selects. Leave it out for the choice that follows the operating system.',
        },
        label: { type: 'text', required: true, summary: 'What the control calls this state.' },
        icon: {
          type: 'icon',
          required: true,
          summary: 'What it shows while in it.',
        },
      },
    },
  },
  render: ({ label, action, choices }) =>
    h(
      'button',
      { class: ['ds-icon-button', 'ds-theme-toggle'], type: 'button', 'data-theme-toggle': true },
      choices.map((choice, index) =>
        h(
          'span',
          {
            class: 'ds-theme-toggle__option',
            /* No palette is the empty value: the attribute the page does not set. */
            'data-theme-option': choice.palette ?? true,
            'data-active': index === 0 || null,
          },
          [
            inlineIcon(choice.icon),
            /*
             * The state and what one click does are the button's accessible name, so
             * they are clipped rather than hidden. `.ds-visually-hidden` is the base
             * utility behind visuallyHidden(), which an atom may not import — see
             * src/styles/base.css. One choice has nowhere to switch to, which the site
             * config refuses; the guard is here so this never reads "switch to" the
             * state it is already in.
             */
            h('span', {
              class: 'ds-visually-hidden',
              text:
                choices.length > 1
                  ? `${label}: ${choice.label}. ${action} ${choices[(index + 1) % choices.length].label}.`
                  : `${label}: ${choice.label}`,
            }),
          ],
        ),
      ),
    ),
});
