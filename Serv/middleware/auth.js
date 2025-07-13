const jwt = require('jsonwebtoken');

const verificaToken = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Token não fornecido' });
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const apenasAdmin = (req, res, next) => {
  if (req.user.papel !== 'admin') return res.status(403).json({ error: 'Acesso apenas para admin' });
  next();
};

const apenasCliente = (req, res, next) => {
  if (req.user.papel !== 'cliente') return res.status(403).json({ error: 'Acesso apenas para cliente' });
  next();
};

const autenticaDispositivo = (req, res, next) => {
  const token = req.body.token || req.headers['x-device-token'];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  if (token === process.env.TOKEN_DISPOSITIVO) return next();
  // fallback para JWT
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = { verificaToken, apenasAdmin, apenasCliente, autenticaDispositivo };
