require('dotenv').config();
const paymentsRouter = require('./routes/payments');
const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const connectDB  = require('./utils/db');

const authRouter       = require('./routes/auth');
const usersRouter      = require('./routes/users');
const medidoresRouter  = require('./routes/medidores');
const leiturasRouter   = require('./routes/leituras');
const falhasRouter     = require('./routes/falhas');
const alertasRouter    = require('./routes/alertas');
const relatoriosRouter = require('./routes/relatorios');
const contabRouter     = require('./routes/contabilidade');
const auditRouter      = require('./routes/audit');

const app = express();
connectDB();

app.use(cors());
app.use(bodyParser.json());

// Rotas
app.use('/api/auth',        authRouter);
app.use('/api/users',       usersRouter);
app.use('/api/medidores',   medidoresRouter);
app.use('/api/leituras',    leiturasRouter);
app.use('/api/falhas',      falhasRouter);
app.use('/api/alertas',     alertasRouter);
app.use('/api/relatorios',  relatoriosRouter);
app.use('/api/contabilidade', contabRouter);
app.use('/api/audit',       auditRouter);
app.use('/api/payments', paymentsRouter);


// Inicia servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🌐 Sistema rodando na porta ${PORT}`);
});
