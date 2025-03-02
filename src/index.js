// Application Insights para monitoramento no Azure
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  const appInsights = require('applicationinsights');
  appInsights.setup()
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .start();
}

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const compression = require('compression');
const passport = require('passport');
const Database = require('./utils/db');
const keyVault = require('./utils/key-vault');

// Carregando variáveis de ambiente
dotenv.config();

// Função assíncrona para inicializar a aplicação
async function initializeApp() {
  try {
    // Verificação completa de porta para compatibilidade com Azure App Service
    console.log('Iniciando aplicativo...');
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`WEBSITES_PORT: ${process.env.WEBSITES_PORT}`);
    console.log(`PORT: ${process.env.PORT}`);
    
    // Carregar segredos do Key Vault em produção
    if (process.env.NODE_ENV === 'production' && process.env.AZURE_KEY_VAULT_NAME) {
      console.log('Carregando segredos do Azure Key Vault...');
      try {
        await keyVault.loadSecrets();
        console.log('Segredos carregados com sucesso');
      } catch (keyVaultError) {
        console.error('Erro ao carregar segredos do Key Vault:', keyVaultError);
        console.log('Continuando com variáveis de ambiente...');
      }
    } else {
      console.log('Usando variáveis de ambiente locais (modo desenvolvimento)');
    }

    // Configuração do Passport
    require('./utils/passport')();

    // Importando rotas
    const authRoutes = require('./routes/auth.routes');
    const billingRoutes = require('./routes/billing.routes');
    const organizationRoutes = require('./routes/organization.routes');
    const dashboardRoutes = require('./routes/dashboard.routes');

    const app = express();

    // Security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.github.com'],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // Compression
    app.use(compression());

    // Configuração do middleware
    const corsOptions = {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    };
    app.use(cors(corsOptions));

    // Use morgan only in development
    if (process.env.NODE_ENV !== 'production') {
      app.use(morgan('dev'));
    }

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Configuração de sessão para produção
    const sessionConfig = {
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    };

    if (process.env.NODE_ENV === 'production') {
      app.set('trust proxy', 1); // trust first proxy for Azure
      sessionConfig.cookie.secure = true; // serve secure cookies
      if (process.env.COOKIE_DOMAIN) {
        sessionConfig.cookie.domain = process.env.COOKIE_DOMAIN;
      }
    }

    app.use(session(sessionConfig));
    app.use(flash());

    // Inicialização do Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Tornando mensagens flash disponíveis para todas as views
    app.use((req, res, next) => {
      res.locals.messages = req.flash();
      res.locals.user = req.user || null;
      next();
    });

    // Health check endpoint for Azure
    app.get('/health', async (req, res) => {
      try {
        console.log('Health check endpoint called');
        let dbHealth = false;
        try {
          dbHealth = await Database.healthCheck();
          console.log('Database health check result:', dbHealth);
        } catch (dbError) {
          console.error('Database health check error:', dbError);
        }
        
        const keyVaultHealth = process.env.NODE_ENV === 'production' ? 
          Boolean(process.env.AZURE_KEY_VAULT_NAME) : true;

        res.status(dbHealth && keyVaultHealth ? 200 : 500).json({
          status: dbHealth && keyVaultHealth ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          database: dbHealth ? 'connected' : 'disconnected',
          keyVault: keyVaultHealth ? 'configured' : 'not configured',
          version: process.env.npm_package_version || 'unknown',
          environment: process.env.NODE_ENV || 'unknown'
        });
      } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          database: 'error',
          message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
          error: process.env.NODE_ENV === 'production' ? undefined : error.stack
        });
      }
    });
    
    // Rota simples para verificar se o aplicativo está respondendo
    app.get('/ping', (req, res) => {
      console.log('Ping endpoint called');
      res.status(200).send('pong');
    });

    // Configurando pasta de arquivos estáticos com cache para produção
    const staticOptions = process.env.NODE_ENV === 'production' ? {
      maxAge: '1d',
      etag: true,
      lastModified: true
    } : {};
    app.use(express.static(path.join(__dirname, '../public'), staticOptions));

    // Configurando o motor de visualização
    app.use(expressLayouts);
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.set('layout', 'layout');

    // Custom middleware para adicionar informações comuns às views
    app.use((req, res, next) => {
      res.locals.currentPath = req.path;
      res.locals.env = process.env.NODE_ENV;
      next();
    });

    // Middleware para verificar autenticação nas rotas do dashboard
    const isAuthenticated = (req, res, next) => {
      if (req.isAuthenticated()) {
        return next();
      }
      req.flash('error', 'Você precisa estar logado para acessar esta página');
      res.redirect('/');
    };

    // Middleware para verificar se uma organização foi selecionada
    const requireSelectedOrg = (req, res, next) => {
      if (!req.session.selectedOrg) {
        req.flash('warning', 'Por favor, selecione uma organização primeiro.');
        return res.redirect('/api/auth/select-organization');
      }
      next();
    };

    // Rotas da API
    app.use('/api/auth', authRoutes);
    app.use('/api/billing', isAuthenticated, requireSelectedOrg, billingRoutes);
    app.use('/api/organizations', isAuthenticated, requireSelectedOrg, organizationRoutes);
    app.use('/dashboard', isAuthenticated, requireSelectedOrg, dashboardRoutes);

    // Rota principal
    app.get('/', (req, res) => {
      res.render('index', { 
        title: 'GitHub Billing App',
        isAuthenticated: req.isAuthenticated(),
        user: req.user
      });
    });

    // Handler para erros 404
    app.use((req, res) => {
      res.status(404).render('404', { title: 'Página não encontrada' });
    });

    // Handler de erro global para produção
    app.use((err, req, res, next) => {
      console.error(err.stack);
      
      // Log error to Application Insights if available
      if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
        const appInsights = require('applicationinsights');
        appInsights.defaultClient.trackException({ exception: err });
      }

      if (process.env.NODE_ENV === 'production') {
        res.status(500).render('error', {
          title: 'Erro',
          message: 'Ocorreu um erro interno no servidor'
        });
      } else {
        res.status(500).render('error', {
          title: 'Erro',
          message: err.message,
          stack: err.stack
        });
      }
    });

    try {
      // Conectar ao banco de dados
      console.log('Tentando conectar ao banco de dados...');
      await Database.connect();
      console.log('Conexão com o banco de dados estabelecida com sucesso!');
    } catch (dbError) {
      console.error('Erro ao conectar ao banco de dados:', dbError);
      // Não encerra a aplicação em caso de falha na conexão com o banco de dados
      // Em produção, permitimos que a aplicação inicie mesmo com falha no banco
      if (process.env.NODE_ENV !== 'production') {
        throw dbError;
      }
    }
    
    // No Azure App Service, a aplicação deve escutar na porta 8080
    // Em outros ambientes, usamos a PORT do ambiente ou 3000 como padrão
    const PORT = process.env.WEBSITES_PORT || process.env.PORT || 8080;
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on 0.0.0.0:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received. Closing server...');
      server.close(() => {
        console.log('Server closed. Database connections will be closed.');
        Database.disconnect()
          .then(() => {
            console.log('Database connections closed.');
            process.exit(0);
          })
          .catch(err => {
            console.error('Error closing database connections:', err);
            process.exit(1);
          });
      });
    });

  } catch (error) {
    console.error('Falha ao inicializar a aplicação:', error.message);
    console.error(error.stack);
    
    // Registrar no Application Insights se disponível
    if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
      try {
        const appInsights = require('applicationinsights');
        appInsights.defaultClient.trackException({ exception: error });
      } catch (aiError) {
        console.error('Erro ao registrar no Application Insights:', aiError);
      }
    }
    
    // Em produção, não encerramos o processo para permitir que o Azure App Service reinicie
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Iniciar a aplicação
console.log('Iniciando processo de inicialização...');
initializeApp().catch(error => {
  console.error('Erro não tratado na inicialização:', error);
  // Em produção, não encerramos o processo para permitir que o Azure tente novamente
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});