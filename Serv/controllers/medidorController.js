const Medidor = require('../models/Medidor');
const Audit   = require('../models/AuditLog');

// GET /api/medidores
exports.listMedidores = async (req, res) => {
  const m = await Medidor.find().populate('cliente');
  res.json(m);
};

// GET /api/medidores/:id
exports.getMedidor = async (req, res) => {
  const m = await Medidor.findById(req.params.id).populate('cliente');
  if (!m) return res.status(404).end();
  res.json(m);
};

// POST /api/medidores
exports.createMedidor = async (req, res) => {
  const { nome, cliente, latitude, longitude, tokenDispositivo } = req.body;
  const m = await Medidor.create({ nome, cliente, localizacao:{latitude,longitude}, tokenDispositivo });
  await Audit.create({
    user: req.user.id,
    rota: 'POST /api/medidores',
    metodo: 'createMedidor',
    params: { nome, cliente }
  });
  res.status(201).json(m);
};

// PUT /api/medidores/:id
exports.updateMedidor = async (req, res) => {
  const updates = req.body;
  const m = await Medidor.findByIdAndUpdate(req.params.id, updates, { new: true });
  await Audit.create({
    user: req.user.id,
    rota: `PUT /api/medidores/${req.params.id}`,
    metodo: 'updateMedidor',
    params: updates
  });
  res.json(m);
};

// DELETE /api/medidores/:id
exports.deleteMedidor = async (req, res) => {
  await Medidor.findByIdAndDelete(req.params.id);
  await Audit.create({
    user: req.user.id,
    rota: `DELETE /api/medidores/${req.params.id}`,
    metodo: 'deleteMedidor'
  });
  res.status(204).end();
};
