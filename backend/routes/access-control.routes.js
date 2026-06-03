const express = require('express');

const {
  getAccessControl,
  syncAccessControl,
  loginAccessCredential,
} = require('../controllers/accessControl.controller');

const router = express.Router();

router.get('/', getAccessControl);
router.put('/', syncAccessControl);
router.post('/login', loginAccessCredential);

module.exports = router;
