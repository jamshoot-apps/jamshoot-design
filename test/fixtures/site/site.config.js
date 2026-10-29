export const site = {
  url: '',
  brand: { name: 'Fixture', tagline: 'A library-owned integration site' },
  appStore: { label: 'Download Fixture', href: null },
  contact: { email: 'fixture@example.com', developer: 'Example' },
  nav: {
    links: [
      { id: 'home', label: 'Home', href: 'index.html' },
      { id: 'support', label: 'Support', href: 'support.html' },
    ],
  },
  footer: {
    blurb: 'This small site exercises the package without importing another repository.',
    groups: [{ title: 'Pages', links: [{ label: 'Support', href: 'support.html' }] }],
    copyright: (year) => `© ${year} Example.`,
  },
  theme: { toggle: true },
  runtime: ['nav', 'theme'],
};
