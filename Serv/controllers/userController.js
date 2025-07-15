const User   = require('../models/User');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

/**
 * GET /api/users/me
 * Retorna o perfil do utilizador autenticado, sem a senha.
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
 * GET /api/users
 * Lista todos os utilizadores (Admin).
 */
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-senha').populate('medidor');
    res.json(users);
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ error: 'Erro ao listar utilizadores.' });
  }
};

/**
 * GET /api/users/:id
 * Retorna um utilizador por ID (Admin).
 */
exports.getUser = async (req, res) => {
  try {
    const u = await User
      .findById(req.params.id)
      .select('-senha')
      .populate('medidor');

    if (!u) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
    res.json(u);
  } catch (err) {
    console.error('getUser error:', err);
    res.status(500).json({ error: 'Erro ao obter utilizador.' });
  }
};

/**
 * POST /api/users
 * Cria um novo utilizador (Admin).
 * Faz hash da senha antes de armazenar.
 */
exports.createUser = async (req, res) => {
  try {
    const { nome, email, senha, papel, medidor } = req.body;

    // 1) Hash da senha
    const hash = await bcrypt.hash(senha, SALT_ROUNDS);

    // 2) Cria o utilizador com a senha já em hash
    const user = new User({
      nome,
      email,
      senha: hash,
      papel,
      medidor
    });
    await user.save();

    // 3) Retorna o utilizador (sem a senha)
    const retorno = await User
      .findById(user._id)
      .select('-senha')
      .populate('medidor');

    res.status(201).json(retorno);
  } catch (err) {
    console.error('createUser error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email já está em uso.' });
    }
    res.status(500).json({ error: 'Erro ao criar utilizador.' });
  }
};

/**
 * PUT /api/users/:id
 * Atualiza um utilizador (Admin).
 * Se vier senha, faz hash antes de guardar.
 */
exports.updateUser = async (req, res) => {
  try {
    const { nome, email, senha, papel, medidor } = req.body;
    const updateData = { nome, email, papel, medidor };

    // Se foi fornecida nova senha, hash
    if (senha) {
      updateData.senha = await bcrypt.hash(senha, SALT_ROUNDS);
    }

    const u = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
    .select('-senha')
    .populate('medidor');

    if (!u) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
    res.json(u);
  } catch (err) {
    console.error('updateUser error:', err);
    res.status(500).json({ error: 'Erro ao atualizar utilizador.' });
  }
};

/**
 * DELETE /api/users/:id
 * Elimina um utilizador (Admin).
 */
exports.deleteUser = async (req, res) => {
  try {
    const u = await User.findByIdAndDelete(req.params.id);
    if (!u) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
    res.json({ message: 'Utilizador eliminado com sucesso.' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ error: 'Erro ao eliminar utilizador.' });
  }
};
