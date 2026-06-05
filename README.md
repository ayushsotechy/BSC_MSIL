# BSC Portal - Maruti Suzuki

Balance Score Card Portal built with a MERN-style stack: Express/MongoDB on the backend and React on the frontend. The app supports three roles: Dealer, MSIL, and Admin. Each role sees the same core BSC score data through a different workflow.

## What This App Does

The portal manages Balance Score Card data for dealers. Admin users can upload a large Excel score sheet, review parsed dealer records, generate dealer access credentials, save scorecards in bulk, edit access-control data, and view/export score sheets. MSIL users can view dealer score data assigned to them. Dealer users can log in with dealer credentials and view/download their own score sheet.

At a high level, the backend is the source of truth, the Excel parser translates the uploaded workbook into app-ready scorecards, and the frontend is the operating console for role-specific workflows.

## Project Structure

```txt
bsc-portal/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── accessControl.controller.js
│   │   ├── auth.controller.js
│   │   └── bsc.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── models/
│   │   ├── AccessRegion.model.js
│   │   ├── AccessZone.model.js
│   │   ├── BscScore.model.js
│   │   ├── DealerAccessCredential.model.js
│   │   ├── MsilAccess.model.js
│   │   └── User.model.js
│   ├── routes/
│   │   ├── access-control.routes.js
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── bsc.routes.js
│   │   ├── dealer.routes.js
│   │   └── msil.routes.js
│   ├── utils/
│   │   └── bscExcelParser.js
│   └── server.js
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── assets/
│       │   ├── maruti-logoo.png
│       │   └── Powered By DE black.png
│       ├── components/
│       │   ├── common/
│       │   │   ├── Navbar.jsx
│       │   │   └── ProtectedRoute.jsx
│       │   └── dealer/
│       │       └── BscScoreSheet.jsx
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── data/
│       │   └── vendorBscData.js
│       ├── pages/
│       │   ├── admin/
│       │   │   └── AdminDashboard.jsx
│       │   ├── auth/
│       │   │   └── LoginPage.jsx
│       │   ├── dealer/
│       │   │   └── DealerDashboard.jsx
│       │   └── msil/
│       │       └── MsilDashboard.jsx
│       ├── services/
│       │   ├── accessControl.service.js
│       │   ├── api.js
│       │   ├── auth.service.js
│       │   └── bsc.service.js
│       ├── App.jsx
│       ├── index.css
│       └── index.js
│
├── package.json
└── README.md
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

Frontend runs on:

```txt
http://localhost:3000
```

Backend runs on the configured `PORT`, currently expected by the frontend proxy as:

```txt
http://localhost:5001
```

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

## Role Flow

Login happens through `frontend/src/context/AuthContext.jsx`. The UI calls the login function with a requested role. The app then redirects to the correct route:

```txt
Dealer -> /dealer/dashboard
MSIL   -> /msil/dashboard
Admin  -> /admin/dashboard
```

Dealer and MSIL credentials are managed through the access-control system, not only the legacy user model. Admin login currently follows the admin logic inside the auth context/backend auth flow.

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

`BscScore.model.js`

Stores dealer score sheets. Each score contains dealer metadata, early-bird summary, full-year summary, business areas, parameters, subtotal objects, and editable root totals.

`DealerAccessCredential.model.js`

Stores dealer login/access information: dealer code, dealer name, mail ID, password, zone, region, assigned MSIL persons, and `isActive`.

`MsilAccess.model.js`

Stores MSIL login/access entries. Deleting an MSIL person is implemented as a soft delete using `isActive: false`.

`AccessZone.model.js` and `AccessRegion.model.js`

Store the selectable zone and region lists used by filters and dealer credentials.

## Access Control Logic

Access-control APIs are implemented in:

```txt
backend/controllers/accessControl.controller.js
backend/routes/access-control.routes.js
frontend/src/services/accessControl.service.js
```

The admin can:

- Add/edit/delete zones.
- Add/edit/delete regions.
- Add/edit/delete MSIL people.
- Add/edit/delete dealer credentials.
- Assign one or more MSIL people to a dealer.

Delete behavior:

- Zone delete removes the zone and clears that zone from dealer credentials.
- Region delete removes the region and clears that region from dealer credentials.
- MSIL delete sets `isActive: false` and removes that MSIL person from dealer assignments.
- Dealer credential delete sets `isActive: false`.

## BSC Score Logic

BSC APIs are implemented in:

```txt
backend/controllers/bsc.controller.js
backend/routes/bsc.routes.js
frontend/src/services/bsc.service.js
```

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

The Excel parser is:

```txt
backend/utils/bscExcelParser.js
```

Admin uploads the large BSC scoresheet from the Admin dashboard. The backend parser reads both the Full Year and Early Bird sheets and maps the transposed Excel layout into the app table layout.

Current workbook mapping:

- Dealer metadata comes from the left-side columns.
- Parameter achieved values map into app table parameter rows.
- Major-row totals map into subtotal rows.
- Max/min values map into early-bird and full-year columns.
- Top score/band/qualification fields map into the score summary area.
- Dealer access credentials are generated during parse review.

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

For very large uploads, the best future design is a backend import job:

```txt
Upload file -> create jobId -> backend parses/saves in background -> frontend polls progress
```

This would reduce browser waiting, payload size, and timeout risk.

## Frontend Flow

Routes are defined in:

```txt
frontend/src/App.jsx
```

API calls are centralized in:

```txt
frontend/src/services/api.js
frontend/src/services/bsc.service.js
frontend/src/services/accessControl.service.js
```

`api.js` creates the Axios instance and attaches common behavior. Service files wrap API calls so UI components do not directly manage endpoint strings everywhere.

## Main Frontend Screens

`LoginPage.jsx`

Role-based login screen. Uses the Maruti Suzuki and Powered by DE assets.

`DealerDashboard.jsx`

Loads the logged-in dealer score data, displays the BSC score sheet, and supports score-sheet/review-sheet actions.

`MsilDashboard.jsx`

Displays dealer data visible to the MSIL user.

`AdminDashboard.jsx`

The main admin control room. It handles:

- BSC master table.
- NSC view.
- Excel upload.
- Parsed Excel preview.
- Bulk save.
- Scorecard View/Edit.
- Score Sheet PDF export.
- Review Sheet export.
- Azure Documents placeholder button.
- Access Credentials page.
- Access Control page.

`BscScoreSheet.jsx`

Shared score-sheet renderer used by dealer/admin flows. It renders:

- Top dealer/score summary.
- Early Bird and Full Year evaluation columns.
- Parameter rows.
- Editable achieved values.
- Editable subtotals.
- Editable grand totals.
- Final note block.

The top identity fields are intentionally read-only in edit mode. Only the configured score summary fields, parameter achieved values, subtotals, and grand totals are editable.

## Downloads and Exports

The admin/dealer score-sheet button currently generates a PDF on the frontend using:

```txt
jspdf
jspdf-autotable
```

The backend still has an Excel `.xlsx` download endpoint for score sheets:

```txt
GET /api/bsc/score/:id/download
```

Review-sheet export is currently handled from the frontend. An Azure Documents placeholder button exists in the Admin BSC master view. Later, this can open Azure-hosted review-sheet documents using dealer code as the unique key.

## Notifications

The frontend uses `react-toastify` for notifications. Browser `alert()` calls have been replaced with toast notifications. The global toast container is configured in:

```txt
frontend/src/App.jsx
```

Toast styling lives in:

```txt
frontend/src/index.css
```

## Important Performance Notes

The BSC score documents are large because each dealer contains a complete nested score sheet. For large uploads of 350+ dealers:

- MongoDB Atlas free tier can be slow because it has limited shared resources.
- Avoid returning full score documents for table lists.
- Use summary mode for master tables.
- Fetch full score details only when opening View/Edit.
- Prefer backend bulk writes for large saves.
- A background import-job design would be better for production-scale uploads.

Useful future improvements:

- Backend-side import jobs with progress polling.
- Store uploaded workbook and parse/save server-side.
- Keep separate score summary and score detail collections.
- Add/verify indexes for dealer code, year, month, zone, and region.
- Avoid sending giant parsed score payloads back and forth through the browser.

## Data Persistence Notes

- Scorecard edits persist through `PUT /api/bsc/score/:id`.
- Access-control edits persist through `/api/access-control` endpoints.
- Zone/region deletes are hard deletes and also clear references from dealer credentials.
- MSIL/dealer credential deletes are soft deletes using `isActive: false`.
- Defaults for zones/regions are seeded only when the respective collection is empty, so deleted default entries do not keep reappearing.

## Development Tips

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
