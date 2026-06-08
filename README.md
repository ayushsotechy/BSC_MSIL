# BSC Portal - Maruti Suzuki

Balance Score Card Portal with an Express/MongoDB backend and a vanilla HTML, CSS, and JavaScript frontend. The app supports three roles: Dealer, MSIL, and Admin. Each role sees the same core BSC score data through a different workflow.

## What This App Does

The portal manages Balance Score Card data for dealers. Admin users can upload a large Excel score sheet, review parsed dealer records, generate dealer access credentials, save scorecards in bulk, edit access-control data, and view/export score sheets. MSIL users can view dealer score data assigned to them. Dealer users can log in with dealer credentials and view/download their own score sheet.

At a high level, the backend is the source of truth, the Excel parser translates the uploaded workbook into app-ready scorecards, and the vanilla frontend is the operating console for role-specific workflows.

## Project Structure

```txt
bsc-portal/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   └── server.js
├── frontend/
│   ├── public/
│   │   ├── index.html              # CRA shell for legacy route redirects
│   │   └── vanilla/                # Static production UI served at /vanilla
│   │       ├── README.md
│   │       ├── index.html          # /vanilla login
│   │       ├── assets/             # Shared image assets
│   │       ├── shared/             # Shared CSS
│   │       ├── auth/               # Login page behavior
│   │       ├── admin/              # Admin dashboard and score editor/viewer
│   │       ├── dealer/             # Dealer dashboard
│   │       └── msil/               # MSIL dashboard
│   └── src/
│       └── index.js                # Thin redirect bundle for old React routes
├── package.json
└── README.md
```

## Frontend Routes

The vanilla frontend intentionally remains inside `frontend/public/vanilla` because files in `public` are served directly by the frontend server and build output. Keeping this folder preserves the current public URLs:

```txt
/vanilla/          Login
/vanilla/admin/    Admin dashboard
/vanilla/msil/     MSIL dashboard
/vanilla/dealer/   Dealer dashboard
```

`frontend/src/index.js` only exists to redirect old React-era routes to the new vanilla URLs:

```txt
/login                    -> /vanilla/
/admin/dashboard          -> /vanilla/admin/
/admin/access-credentials -> /vanilla/admin/
/msil/dashboard           -> /vanilla/msil/
/msil/access-credentials  -> /vanilla/msil/
/dealer/dashboard         -> /vanilla/dealer/
```

## Setup

Install dependencies from the root:

```bash
npm run install:all
```

Create a backend environment file:

```bash
cd backend
cp .env.example .env
```

Typical backend `.env` values:

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/bsc_portal
JWT_SECRET=replace_with_a_secret
NODE_ENV=development
JSON_BODY_LIMIT=10mb
CORS_ORIGIN=http://localhost:3000
```

Run both servers from the root:

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`. Backend runs on the configured `PORT`, currently expected by the frontend proxy as `http://localhost:5001`.

## Scripts

Root:

```bash
npm run dev          # Run backend and frontend together
npm run server       # Run backend only
npm run client       # Run frontend only
npm run install:all  # Install root, backend, and frontend dependencies
```

Backend:

```bash
npm run dev
npm start
```

Frontend:

```bash
npm start
npm run build
```

## Backend Flow

`backend/server.js` configures Express middleware, CORS, request limits, API routes, error handling, and the MongoDB connection. Backend routes are grouped by feature:

```txt
/api/auth
/api/dealer
/api/msil
/api/admin
/api/bsc
/api/access-control
```

The main backend responsibilities are:

- Validate and route API requests.
- Query and update MongoDB through Mongoose models.
- Parse uploaded Excel score sheets.
- Save BSC scorecards and access credentials.
- Provide summary and detail score data to the frontend.
- Generate server-side Excel downloads for legacy score-sheet export.

## Core Backend Models

`BscScore.model.js` stores dealer score sheets. Each score contains dealer metadata, early-bird summary, full-year summary, business areas, parameters, subtotal objects, and editable root totals.

`DealerAccessCredential.model.js` stores dealer login/access information: dealer code, dealer name, mail ID, password, zone, region, assigned MSIL persons, and `isActive`.

`MsilAccess.model.js` stores MSIL login/access entries. Deleting an MSIL person is implemented as a soft delete using `isActive: false`.

`AccessZone.model.js` and `AccessRegion.model.js` store the selectable zone and region lists used by filters and dealer credentials.

## BSC Score Logic

Important endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/bsc/score` | List BSC scores. Supports summary mode. |
| GET | `/api/bsc/score/:id` | Fetch full score details. |
| POST | `/api/bsc/score` | Create score. |
| PUT | `/api/bsc/score/:id` | Update score. |
| POST | `/api/bsc/upload-excel` | Upload and parse admin Excel score sheet. |
| POST | `/api/bsc/bulk-save` | Bulk-save parsed scorecards. |
| GET | `/api/bsc/score/:id/download` | Backend Excel download. |

The frontend uses summary loading for the master list and only fetches full score detail when the user opens View/Edit. This keeps the list faster because full score sheets are large nested documents.

## Excel Upload Flow

The Excel parser is `backend/utils/bscExcelParser.js`. Admin uploads the large BSC scoresheet from the Admin dashboard. The backend parser reads both the Full Year and Early Bird sheets and maps the transposed Excel layout into the app table layout.

Current admin upload/save flow:

```txt
1. Admin uploads Excel.
2. Backend parses workbook.
3. Frontend receives parsed scorecards and generated credentials.
4. Admin reviews preview.
5. Admin clicks Save All Dealers.
6. Frontend saves access credentials and scorecards in batches.
7. Backend writes data to MongoDB.
```

## Important Performance Notes

The BSC score documents are large because each dealer contains a complete nested score sheet. For large uploads of 350+ dealers:

- Avoid returning full score documents for table lists.
- Use summary mode for master tables.
- Fetch full score details only when opening View/Edit.
- Prefer backend bulk writes for large saves.
- A background import-job design would be better for production-scale uploads.

## Data Persistence Notes

- Scorecard edits persist through `PUT /api/bsc/score/:id`.
- Access-control edits persist through `/api/access-control` endpoints.
- Zone/region deletes are hard deletes and also clear references from dealer credentials.
- MSIL/dealer credential deletes are soft deletes using `isActive: false`.
- Defaults for zones/regions are seeded only when the respective collection is empty, so deleted default entries do not keep reappearing.

## Development Tips

- Keep static frontend files under `frontend/public/vanilla` unless you also plan a route migration.
- Run `npm run build` in `frontend/` after UI changes.
- Run `node --check <file>` for backend syntax checks after controller/route/model edits.
- Keep backend data shape and frontend normalizers in sync when adding fields.
- Be careful with large JSON payloads; backend body limit is controlled by `JSON_BODY_LIMIT`.
- The frontend proxy points to `http://localhost:5001`, so keep backend `PORT=5001` unless you also update the proxy.

## Quick Verification Commands

```bash
cd backend
node --check server.js
node --check controllers/bsc.controller.js
node --check controllers/accessControl.controller.js

cd ../frontend
npm run build
```
