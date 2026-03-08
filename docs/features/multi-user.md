# Feature: Authentication / Multi-User Support

**Status:** Not started
**Priority:** 4 — needed for shared deployments

## Summary

Currently a single-user app with no authentication. A lightweight device-based approach would allow multiple users without a login screen.

## Proposed approach (device-based, no login)

- Client generates a UUID on first visit, stores in `localStorage` as `recipeaid_user_id`
- Sends `X-User-Id` header with every API request
- Backend validates header, filters all recipe queries by `UserId`
- Add `UserId` field to the Recipe document
- No user profiles, no passwords, no login flow

## Future (only if multi-user sharing is needed)

- Real auth: email/password + JWT (ASP.NET Core Identity)
- Shared recipe collections
- User profiles / settings
