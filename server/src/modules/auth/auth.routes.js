const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const prisma  = require('../../config/database');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success, created, unauthorized } = require('../../shared/utils/apiResponse');

const signToken = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

// POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, departmentId } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, departmentId },
    select: { id: true, name: true, email: true, role: true, departmentId: true },
  });
  const token = signToken(user);
  created(res, { token, user }, 'Account created successfully');
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findFirst({
    where: { email, isActive: true, deletedAt: null },
  });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return unauthorized(res, 'Invalid email or password');
  }
  const { password: _, ...safeUser } = user;
  const token = signToken(safeUser);
  success(res, { token, user: safeUser }, 'Login successful');
}));

// GET /api/auth/me
router.get('/me', require('../../middleware/auth').protect, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, name: true, email: true, role: true, avatarUrl: true,
      xpTotal: true, level: true, departmentId: true,
      department: { select: { name: true } },
    },
  });
  success(res, { user });
}));

module.exports = router;
