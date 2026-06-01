const express = require('express');
const router = express.Router();
const {
  getBscScore,
  getBscScoreById,
  downloadScoreSheet,
  createBscScore,
  updateBscScore,
} = require('../controllers/bsc.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect); // All BSC routes require auth

router.get('/score', getBscScore);
router.get('/score/:id', getBscScoreById);
router.get('/score/:id/download', downloadScoreSheet);
router.post('/score', authorize('msil', 'admin'), createBscScore);
router.put('/score/:id', authorize('msil', 'admin'), updateBscScore);

module.exports = router;
