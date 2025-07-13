require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const connectDB  = require('./utils/db');

const app = express();
connectDB();

app.use(cors());
app.use(bodyParser.json());

// Rotas
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/medidores', require('./routes/medidores'));
app.use('/api/leituras',  require('./routes/leituras'));
app.use('/api/falhas',    require('./routes/falhas'));
app.use('/api/alertas',   require('./routes/alertas'));
app.use('/api/relatorios',require('./routes/relatorios'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🌐 sistema rodando na porta ${PORT}`);
});
