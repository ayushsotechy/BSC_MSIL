# Vanilla Frontend

This directory is the deployed static UI for the BSC Portal. It stays under `frontend/public/vanilla` so the existing public URLs keep working after the React-to-vanilla migration.

## Routes

```txt
/vanilla/          Login
/vanilla/admin/    Admin dashboard
/vanilla/msil/     MSIL dashboard
/vanilla/dealer/   Dealer dashboard
```

## Folder Layout

```txt
vanilla/
├── index.html          # Login entry
├── assets/             # Shared brand images
├── shared/             # Shared global styles
├── auth/               # Login JavaScript
├── admin/              # Admin dashboard and score page
├── dealer/             # Dealer dashboard
└── msil/               # MSIL dashboard
```

## Notes

- Keep route folders (`admin`, `dealer`, `msil`) at this level unless the route strategy changes.
- Shared UI rules belong in `shared/styles.css`.
- Page-specific styles and scripts should stay beside that page's `index.html`.
- `frontend/src/index.js` is only a compatibility redirect bundle for old React routes.
