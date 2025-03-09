const express = require('express');
const {
  register,
  login,
  driverLogin,
  logout,
  getMe
} = require('../controllers/authController');

const { protect } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/driver/login', driverLogin);
router.get('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
