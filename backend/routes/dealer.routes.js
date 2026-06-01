const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');

// Dealer-specific routes (extend as needed)
router.use(protect, authorize('dealer', 'admin'));

router.get('/dashboard', (req, res) => {
  res.json({ success: true, message: 'Dealer dashboard', user: req.user });
});

module.exports = router;
