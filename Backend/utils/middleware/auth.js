// Verifica JWT ou token de dispositivo
const jwt = require('jsonwebtoken');

const autenticaDispositivo = (req, res, next) => {
  const token = req.body.token || req.headers['x-device-token'];
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  // Se for token estático de dispositivo:
  if (token === process.env.TOKEN_DISPOSITIVO) {
    return next();
  }
  // Caso queira suportar JWT para utilizadores:
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = autenticaDispositivo;
