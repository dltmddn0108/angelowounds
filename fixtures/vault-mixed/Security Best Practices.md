---
aliases: [security, 보안, web security]
tags: [security, backend, frontend]
---

# Security Best Practices

Web security is non-negotiable. A single vulnerability can compromise user data and destroy trust.

## Common Vulnerabilities

### XSS (Cross-Site Scripting)

Never trust user input. Always sanitize and escape output.

```javascript
// BAD - direct innerHTML
element.innerHTML = userInput;

// GOOD - use textContent or a sanitizer
element.textContent = userInput;
// or with DOMPurify
element.innerHTML = DOMPurify.sanitize(userInput);
```

React escapes JSX by default, but `dangerouslySetInnerHTML` bypasses this protection.

### CSRF (Cross-Site Request Forgery)

Use anti-CSRF tokens for state-changing requests. SameSite cookies provide additional protection.

### SQL Injection

Always use parameterized queries. ORMs like Prisma handle this automatically, but raw queries in Node.js need care. See 데이터베이스 기초 for proper query patterns.

## Authentication

- Use bcrypt or Argon2 for password hashing (never MD5/SHA for passwords)
- Implement proper session management with secure, httpOnly cookies
- Consider OAuth 2.0 / OpenID Connect for third-party auth

## Authorization

Enforce authorization on the server side. Never rely on client-side checks alone. REST API endpoints must validate permissions on every request.

## Headers

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Dependencies

Run `npm audit` regularly. Use Dependabot or Renovate for automated dependency updates. Supply chain attacks are increasingly common.

> [!info] Security Mindset
> Security is a process, not a feature. Regular audits, penetration testing, and staying updated on OWASP Top 10 are essential.
