# Security policy

Report security vulnerabilities privately. Do not put credentials, private content
or an exploitable proof of concept in a public issue.

Use [GitHub private vulnerability reporting](https://github.com/jamshoot-apps/jamshoot-design/security/advisories/new)
when it is enabled. If that form is unavailable, contact `hello@jamshoot.net`.
Include the affected version, a minimal reproduction, expected impact and any
proposed mitigation. Remove personal information and secrets from logs and examples.

Security fixes target the latest released version. Review the changelog and upgrade
when a fix is available; older versions do not have a separate maintenance schedule.

## Trust boundaries

The build executes JavaScript configuration, page renderers and site blocks. Only
build source that you trust. Plain text component fields are escaped, while fields
that accept authored HTML are not a sanitization boundary. Do not pass untrusted
user HTML to those fields.

Local preview servers bind to loopback. They are development tools, not production
hosting services. Production builds contain static files intended for a static
web host.

GitHub release and npm publication workflows require an explicit manual run. npm
uses OIDC trusted publishing; repository secrets do not need an npm publish token.
