const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('msil', 'admin'));

router.get('/dashboard', (req, res) => {
  res.json({ success: true, message: 'MSIL dashboard', user: req.user });
});

module.exports = router;
