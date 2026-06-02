const express = require('express');
const multer = require('multer');

const router = express.Router();

const {
  getBscScore,
  getBscScoreById,
  downloadScoreSheet,
  createBscScore,
  updateBscScore,
  uploadBscExcel,
  bulkSaveBscScores,
} = require('../controllers/bsc.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

router.get('/score', getBscScore);
router.get('/score/:id', getBscScoreById);
router.get('/score/:id/download', downloadScoreSheet);

router.post('/score', createBscScore);
router.put('/score/:id', updateBscScore);

router.post('/upload-excel', upload.single('file'), uploadBscExcel);
router.post('/bulk-save', bulkSaveBscScores);

module.exports = router;