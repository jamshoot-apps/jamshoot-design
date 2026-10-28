export const home = {
  hero: {
    title: 'Build the page from the library checkout.',
    lead: 'This fixture imports current component source and sends only rendered markup to the browser.',
  },
  cards: [
    { title: 'Static output', body: 'Component functions run during the build. Their renderers are absent from the emitted browser script.' },
    { title: 'Owned styles', body: 'The bundled stylesheet includes component folders, the shared foundation files and one project block.' },
    { title: 'Checked inputs', body: 'A wrong option, incomplete nested row or invalid page path stops the build before replacing the last result.' },
    { title: 'Explicit location', body: 'The runner receives this site by path. No parent directory or neighbouring repository is searched.' },
  ],
  closing: {
    title: 'The fixture covers the complete workflow.',
    lead: 'Build, lint and documentation checks can run from an isolated copy of this repository.',
  },
};
