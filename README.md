# BSC Portal – Maruti Suzuki
**Balance Score Card Portal** | MERN Stack | Role-based access (Dealer / MSIL / Admin)

---

## 📁 Project Structure

```
bsc-portal/
├── backend/
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.js       # Login, getMe
│   │   └── bsc.controller.js        # BSC CRUD + Excel download
│   ├── middleware/
│   │   ├── auth.middleware.js       # JWT protect + authorize(roles)
│   │   └── error.middleware.js      # Global error handler
│   ├── models/
│   │   ├── User.model.js            # User (dealer/msil/admin)
│   │   └── BscScore.model.js        # BSC score sheet data
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── bsc.routes.js
│   │   ├── dealer.routes.js
│   │   ├── msil.routes.js
│   │   └── admin.routes.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   ├── common/
│       │   │   ├── Navbar.jsx / .css
│       │   │   └── ProtectedRoute.jsx
│       │   └── dealer/
│       │       ├── BscScoreSheet.jsx  # Main score table component
│       │       └── BscScoreSheet.css
│       ├── context/
│       │   └── AuthContext.jsx        # Global auth state
│       ├── pages/
│       │   ├── auth/
│       │   │   ├── LoginPage.jsx      # Login UI (black=dealer, blue=msil)
│       │   │   └── LoginPage.css
│       │   └── dealer/
│       │       ├── DealerDashboard.jsx
│       │       └── DealerDashboard.css
│       ├── services/
│       │   ├── api.js                 # Axios instance + interceptors
│       │   ├── auth.service.js
│       │   └── bsc.service.js         # BSC API calls + file download
│       ├── App.jsx                    # Routes
│       ├── index.js
│       └── index.css
│
├── package.json                       # Root scripts (concurrently)
└── README.md
```

---

## 🚀 Setup & Run

### 1. Clone & install
```bash
git clone <repo>
cd bsc-portal
npm run install:all
```

### 2. Configure environment
```bash
cd backend
cp .env.example .env
# Edit .env:
#   MONGO_URI=mongodb://localhost:27017/bsc_portal
#   JWT_SECRET=your_secret_here
#   NODE_ENV=development
```

### 3. Run (both servers)
```bash
# From root
npm run dev
```
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

---

## 🔐 Authentication & Roles

| Button Color | Role   | Route after login       |
|-------------|--------|-------------------------|
| **Black**   | Dealer | `/dealer/dashboard`     |
| **Blue**    | MSIL   | `/msil/dashboard`       |
| Text link   | Admin  | `/admin/dashboard`      |

JWT token stored in `localStorage` as `bsc_token`.

---

## 📊 API Endpoints

### Auth
| Method | Endpoint          | Description          |
|--------|-------------------|----------------------|
| POST   | `/api/auth/login` | Login (all roles)    |
| GET    | `/api/auth/me`    | Get current user     |

### BSC Scores
| Method | Endpoint                       | Access            |
|--------|--------------------------------|-------------------|
| GET    | `/api/bsc/score`               | All (role-scoped) |
| GET    | `/api/bsc/score/:id`           | All               |
| GET    | `/api/bsc/score/:id/download`  | All — returns .xlsx |
| POST   | `/api/bsc/score`               | MSIL, Admin       |
| PUT    | `/api/bsc/score/:id`           | MSIL, Admin       |

### Admin
| Method | Endpoint                       | Description        |
|--------|--------------------------------|--------------------|
| GET    | `/api/admin/users`             | List all users     |
| POST   | `/api/admin/users`             | Create user        |
| PATCH  | `/api/admin/users/:id/toggle`  | Toggle active      |

---

## 📥 Score Sheet Download

The `/api/bsc/score/:id/download` endpoint generates an Excel `.xlsx` file with:
- **Sheet 1 – Summary**: Region, Dealer Name, Early Bird & Full Year scores/bands
- **Sheet 2 – Score Sheet**: Full parameter breakdown per Business Area

Uses the `xlsx` npm package server-side. Frontend triggers a blob download via `triggerDownload()` in `bsc.service.js`.

---

## 🗃️ Seed Data (optional)

```js
// Run in MongoDB shell or create a seed script
db.users.insertOne({
  username: "sanvit001",
  email: "sanvit@dealer.com",
  password: "<bcrypt hash of 'password123'>",
  role: "dealer",
  dealerCode: "DL001",
  dealerName: "Sanvit Automotives",
  region: "South 2",
  isActive: true
})
```
