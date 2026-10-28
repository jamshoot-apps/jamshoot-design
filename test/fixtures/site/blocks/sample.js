import { h } from '../../../../src/markup.js';

export function sampleBlock() {
  return h('div', { class: 'fixture-sample', 'data-fixture-block': true }, [
    h('strong', { text: 'Representative project block.' }),
    h('span', { text: ' It is rendered during the static build.' }),
  ]);
}
