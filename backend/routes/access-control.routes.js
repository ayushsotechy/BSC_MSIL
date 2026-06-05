const express = require('express');

const {
  getAccessControl,
  syncAccessControl,
  loginAccessCredential,
  upsertDealerCredential,
  upsertMsilPerson,
  deleteZone,
  deleteRegion,
  deleteMsilPerson,
  deleteDealerCredential,
} = require('../controllers/accessControl.controller');

const router = express.Router();

router.get('/', getAccessControl);
router.put('/', syncAccessControl);
router.post('/dealer-credential', upsertDealerCredential);
router.post('/msil-person', upsertMsilPerson);
router.delete('/zone/:id', deleteZone);
router.delete('/region/:id', deleteRegion);
router.delete('/msil-person/:id', deleteMsilPerson);
router.delete('/dealer-credential/:id', deleteDealerCredential);
router.post('/login', loginAccessCredential);

module.exports = router;
