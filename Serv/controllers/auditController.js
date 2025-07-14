const AuditLog = require('../models/AuditLog');

exports.listarAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ data: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria.' });
  }
};
