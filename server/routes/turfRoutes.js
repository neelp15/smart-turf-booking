const express = require('express');
const router = express.Router();
const { getTurfs, createTurf } = require('../controllers/turfController');

router.get('/', getTurfs);
router.post('/', createTurf);

module.exports = router;
