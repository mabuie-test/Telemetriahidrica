const User  = require('../models/User');
const Audit = require('../models/AuditLog');
const bcrypt = require('bcrypt');

// GET /api/users
exports.listUsers = async (req, res) => {
  const users = await User.find().select('-senha').populate('medidor');
  res.json(users);
};

// GET /api/users/:id
exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select('-senha').populate('medidor');
  if (!user) return res.status(404).end();
  res.json(user);
};

// POST /api/users
exports.createUser = async (req, res) => {
  const { nome, email, senha, papel, medidor } = req.body;
  const hash = await bcrypt.hash(senha, 10);
  const user = await User.create({ nome, email, senha: hash, papel, medidor });
  await Audit.create({
    user: req.user.id,
    rota: 'POST /api/users',
    metodo: 'createUser',
    params: { nome, email, papel, medidor }
  });
  res.status(201).json({ id: user._id, email: user.email, papel: user.papel });
};

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
  const updates = { ...req.body };
  if (updates.senha) updates.senha = await bcrypt.hash(updates.senha, 10);
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
  await Audit.create({
    user: req.user.id,
    rota: `PUT /api/users/${req.params.id}`,
    metodo: 'updateUser',
    params: updates
  });
  res.json(user);
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  await Audit.create({
    user: req.user.id,
    rota: `DELETE /api/users/${req.params.id}`,
    metodo: 'deleteUser'
  });
  res.status(204).end();
};
