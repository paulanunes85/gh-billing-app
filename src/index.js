const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');

// Carregando variáveis de ambiente
dotenv.config();

// Importando rotas
const authRoutes = require('./routes/auth.routes');
const billingRoutes = require('./routes/billing.routes');
const organizationRoutes = require('./routes/organization.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// Configuração do middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuração de sessão
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'github-copilot-billing-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// Configuração de flash messages
app.use(flash());

// Configurando pasta de arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Configurando o motor de visualização
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/dashboard', dashboardRoutes);

// Rota principal
app.get('/', (req, res) => {
  res.render('index');
});

// Manipulação de erros 404
app.use((req, res) => {
  res.status(404).render('404');
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});