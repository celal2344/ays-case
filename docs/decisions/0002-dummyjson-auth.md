# 0002 Auth via DummyJSON /auth/login, role from /auth/me

- **Status:** Accepted (2026-11-03)

## Context
Brief: simple form, no real password check, "dummy user check", admin and user capabilities, session survives refresh via localStorage.

## Decision
Log in with real DummyJSON users (`POST /auth/login`), read `role` from `GET /auth/me`, persist tokens + user in a Zustand `persist` store, refresh on 401. "Fill admin / Fill user" buttons remove the need to know passwords.

## Consequences
- Uses extra API endpoints (bonus), roles come from data, not hardcoded.
- Real token expiry → needs the refresh interceptor (covered in tests).
- Depends on DummyJSON being up (acceptable; whole app does).

## Alternatives considered
- **Hardcoded local users:** zero network, but less realistic and no token/refresh handling to show.
