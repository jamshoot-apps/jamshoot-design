import assert from 'node:assert/strict';
import { test } from 'node:test';

import { escape, fragment, h, raw } from '../../src/html.js';

test('text is escaped, html is not', () => {
  assert.equal(String(h('p', { text: '5 > 3 & "quoted"' })), '<p>5 &gt; 3 &amp; &quot;quoted&quot;</p>');
  assert.equal(String(h('p', { html: '<em>ok</em>' })), '<p><em>ok</em></p>');
});

test('attribute values are escaped', () => {
  assert.equal(String(h('a', { href: '?a=1&b=2', title: '"x"' })), '<a href="?a=1&amp;b=2" title="&quot;x&quot;"></a>');
});

test('null, undefined and false omit a prop or a child', () => {
  assert.equal(String(h('p', { id: null, class: undefined, hidden: false })), '<p></p>');
  assert.equal(String(h('div', {}, [null, 'a', false, undefined, 'b'])), '<div>ab</div>');
});

test('an empty alt survives, an empty class does not', () => {
  assert.equal(String(h('img', { alt: '', class: '' })), '<img alt="">');
});

test('true renders a bare attribute', () => {
  assert.equal(String(h('details', { open: true })), '<details open></details>');
});

test('class arrays drop their falsy entries', () => {
  assert.equal(String(h('p', { class: ['card', false && 'x', 'card--lead'] })), '<p class="card card--lead"></p>');
});

test('void elements have no closing tag', () => {
  assert.equal(String(h('img', { src: 'a.png' })), '<img src="a.png">');
  assert.equal(String(h('br')), '<br>');
});

test('elements nest without re-escaping', () => {
  const inner = h('span', { text: 'a & b' });
  assert.equal(String(h('p', {}, inner)), '<p><span>a &amp; b</span></p>');
});

test('nested arrays of children are flattened', () => {
  assert.equal(String(h('ul', {}, [[h('li', { text: '1' }), h('li', { text: '2' })]])), '<ul><li>1</li><li>2</li></ul>');
});

test('raw passes markup through, fragment joins', () => {
  assert.equal(String(raw('<hr>')), '<hr>');
  assert.equal(String(fragment([h('a'), h('b')])), '<a></a><b></b>');
});

test('escape covers every character that can break out of an attribute', () => {
  assert.equal(escape(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;');
});
