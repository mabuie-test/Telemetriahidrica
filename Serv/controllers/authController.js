const User   = require('../models/User');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(senha, user.senha)) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = jwt.sign({
      id: user._id,
      nome: user.nome,
      papel: user.papel,
      medidor: user.medidor
    }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, nome: user.nome, papel: user.papel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/register (Admin only)
exports.register = async (req, res) => {
  try {
    const { nome, email, senha, papel, medidor } = req.body;
    const hash = await bcrypt.hash(senha, 10);
    const user = await User.create({ nome, email, senha: hash, papel, medidor });
    res.status(201).json({ id: user._id, email: user.email, papel: user.papel });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
