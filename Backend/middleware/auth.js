// backend/middleware/auth.js

const jwt = require('jsonwebtoken');

// Middleware que autentica tanto pelo token estático do dispositivo
// quanto por JWT de utilizador (caso queira suportar painel seguro)
const autenticaDispositivo = (req, res, next) => {
  // O token pode vir no body ou no header x-device-token
  const token = req.body.token || req.headers['x-device-token'];
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  // Se for o token estático definido em .env, permite avançar
  if (token === process.env.TOKEN_DISPOSITIVO) {
    return next();
  }

  // Caso contrário, tenta validação JWT
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = autenticaDispositivo;

