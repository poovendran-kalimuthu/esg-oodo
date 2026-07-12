const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All user routes are protected
router.use(protect);

// GET  /api/users          — admin only
router.get('/', restrictTo('admin', 'superadmin'), userController.getAllUsers);

// GET  /api/users/:id
router.get('/:id', userController.getUserById);

// PUT  /api/users/:id      — admin only
router.put('/:id', restrictTo('admin', 'superadmin'), userController.updateUser);

// DELETE /api/users/:id   — superadmin only
router.delete('/:id', restrictTo('superadmin'), userController.deleteUser);

module.exports = router;
