const User = require('../models/User');

/**
 * GET /api/users/me
 * Retorna o perfil do utilizador autenticado, com medidor populado.
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User
      .findById(req.user.id)
      .select('-senha')
      .populate('medidor');

    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
    res.json(user);
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ error: 'Erro ao carregar perfil.' });
  }
};

/**
 * Resto das actions para Admin (listar, criar, actualizar, eliminar)
 */
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-senha').populate('medidor');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar utilizadores.' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select('-senha').populate('medidor');
    if (!u) return res.status(404).json({ error: 'Não encontrado.' });
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter utilizador.' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const u = await User.create(req.body);
    res.status(201).json(u);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const u = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-senha');
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Utilizador eliminado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
