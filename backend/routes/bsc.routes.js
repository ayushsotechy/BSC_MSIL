const express = require('express');
const router = express.Router();
const {
  getBscScore,
  getBscScoreById,
  downloadScoreSheet,
  createBscScore,
  updateBscScore,
} = require('../controllers/bsc.controller');
// const { protect, authorize } = require('../middleware/auth.middleware');

// Temporarily commented out to bypass login requirement
// router.use(protect); 

router.get('/score', getBscScore);
router.get('/score/:id', getBscScoreById);
router.get('/score/:id/download', downloadScoreSheet);

// Temporarily removed authorize('msil', 'admin') for testing
router.post('/score', createBscScore);
router.put('/score/:id', updateBscScore);

module.exports = router;