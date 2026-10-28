import { h } from '../../src/html.js';
import { LAYERS } from '../../src/tokens/contract.js';
import { LAYER_SOURCES } from '../../src/cli/styles.mjs';

/** Documentation-only block; the build owns the source paths and cascade order. */
export function cssAssembly() {
  return String(h('figure', { class: 'css-assembly' }, [
    h('figcaption', { class: 'css-assembly__caption', text: 'Source files → CSS layers → One stylesheet' }),
    h('ol', { class: 'css-assembly__layers' }, LAYERS.map((layer) => {
      const site = layer === 'ds.theme' || layer === 'site.blocks';
      const paths = layer === 'ds.theme'
        ? ['site/theme.css', 'site/themes/*.css']
        : layer === 'site.blocks'
          ? ['site/blocks/**/*.css']
          : LAYER_SOURCES.filter(([name]) => name === layer)
            .map(([, path]) => path.endsWith('/') ? `${path}**/*.css` : path);

      return h('li', { class: 'css-assembly__row' }, [
        h('div', { class: 'css-assembly__sources' }, [
          h('span', { class: 'css-assembly__label', text: site ? 'Site files' : 'Library files' }),
          paths.map((path) => h('code', { text: path })),
          layer === 'ds.theme' && h('p', {
            class: 'css-assembly__note',
            text: 'Palettes expanded by src/themes.js. Configured font-face rules also join this layer.',
          }),
        ]),
        h('span', { class: 'css-assembly__arrow', 'aria-hidden': 'true', text: '→' }),
        h('div', { class: 'css-assembly__layer' }, [
          h('span', { class: 'css-assembly__label', text: 'CSS layer' }),
          h('code', { text: layer }),
        ]),
      ]);
    })),
    h('div', { class: 'css-assembly__output' }, [
      h('span', { class: 'css-assembly__label', text: 'One stylesheet · layers in the order above' }),
      h('code', { text: 'site/dist/styles/site.<hash>.css' }),
      h('p', { class: 'css-assembly__note', text: 'src/cli/styles.mjs assembles the layers; src/cli/build.mjs writes the file.' }),
    ]),
  ]));
}
