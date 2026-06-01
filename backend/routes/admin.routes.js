const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const User = require('../models/User.model');

router.use(protect, authorize('admin'));

// Get all users
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/users', async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Toggle user active status
router.patch('/users/:id/toggle', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
