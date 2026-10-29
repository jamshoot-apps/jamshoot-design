# Footer

<!-- docs-review: 63e2654cb2fb; reason: Reviewed option summaries now saying link groups to match footer.groups -->

The shared footer with link columns, optional description and contact details, and
legal copy. Configure it in `site.config.js`; the page template renders it after
`main` on every page.

Start with [Footer configuration](https://jamshoot-apps.github.io/jamshoot-design/configuration.html#footer) and its
[template mapping](https://jamshoot-apps.github.io/jamshoot-design/configuration.html#shared-component-mapping).
The calls below document the component API used by the template; do not add another
footer inside a page's `render` function.

## Usage

```example title="Footer with contact"
footer({
  blurb: 'Tools for the work you make.',
  email: 'help@example.com',
  groups: [{ title: 'Help', links: [{ label: 'Support', href: 'support.html' }] }],
  copyright: '© Example',
})
```

```example title="Links and legal copy only"
footer({
  email: 'help@example.com',
  showContact: false,
  groups: [{ title: 'Legal', links: [{ label: 'Privacy', href: 'privacy.html' }] }],
  copyright: '© Example',
  legalNote: 'Product names belong to their respective owners.',
})
```

```options footer
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `blurb` | `string` | optional | An optional product description beside the link groups. |
| `email` | `string` | optional | The contact email, linked with mailto. |
| `showContact` | `true or false` | default `true` | Show the contact email when one is supplied. |
| `groups` | `non-empty array of { title, links }` | required | The link groups, left to right. |
| `groups[].title` | `string` | required | What the group holds. |
| `groups[].links` | `non-empty array of { label, href }` | required | The links in the group. |
| `groups[].links[].label` | `string` | required | What the link says. |
| `groups[].links[].href` | `string` | required | Where it goes. |
| `copyright` | `string` | required | The copyright notice, with the year already resolved. |
| `legalNote` | `string` | optional | Trademark attributions above the copyright line. |
```

## Composition

With neither a blurb nor a visible contact address, the introduction column is omitted.
`showContact: false` hides the address without removing it from the site's config.
The footer renders static links and needs no runtime.

The component calls its link columns `groups`, each with a title and links. The page
template maps `footer.groups` in site config to these groups.

The component receives the copyright as text. The page template resolves a site's
`footer.copyright(year)` function using the build year and passes `contact.email`
separately. Sites keep that function and all published strings in
[Site configuration](https://jamshoot-apps.github.io/jamshoot-design/configuration.html).
