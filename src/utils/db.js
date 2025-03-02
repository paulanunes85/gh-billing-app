const mongoose = require('mongoose');

/**
 * Classe responsável pela conexão com o banco de dados MongoDB
 */
class Database {
  /**
   * Inicializa a conexão com o MongoDB
   * @returns {Promise} Promise resolvida quando a conexão é estabelecida
   */
  static connect() {
    return new Promise((resolve, reject) => {
      // Se já estiver conectado, retorna imediatamente
      if (mongoose.connection.readyState === 1) {
        console.log('MongoDB já está conectado');
        return resolve();
      }

      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gh-billing-app';
      const dbName = process.env.DB_NAME || 'gh-billing-app';
      
      console.log(`Tentando conectar ao MongoDB (ambiente: ${process.env.NODE_ENV || 'development'}, database: ${dbName})`);
      console.log(`URI do MongoDB: ${mongoURI.replace(/mongodb(\+srv)?:\/\/[^:]+:[^@]+@/, 'mongodb$1://***:***@')}`);
      
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: dbName,
        retryWrites: true,
        w: 'majority',
        retryReads: true,
        serverSelectionTimeoutMS: 30000, // Aumentado para 30 segundos
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000, // Aumentado para 30 segundos
        heartbeatFrequencyMS: 10000,
      };

      // Adiciona opções específicas para ambiente de produção
      if (process.env.NODE_ENV === 'production') {
        Object.assign(options, {
          ssl: true,
          replicaSet: 'globaldb',
          readPreference: 'nearest',
          retryWrites: false, // Cosmos DB não suporta retryWrites
        });
      }

      // Seja mais tolerante a erros em produção
      let connectionAttempts = 0;
      const maxRetries = process.env.NODE_ENV === 'production' ? 5 : 3;
      const retryInterval = 5000; // 5 segundos

      const attemptConnection = () => {
        connectionAttempts++;
        console.log(`Tentativa de conexão ${connectionAttempts}/${maxRetries}`);
        
        mongoose.connect(mongoURI, options)
          .then(() => {
            console.log(`✅ Conexão com MongoDB estabelecida com sucesso (${process.env.NODE_ENV || 'development'})`);
            
            // Configurar event listeners para monitorar a conexão
            mongoose.connection.on('error', (err) => {
              console.error('Erro na conexão MongoDB:', err);
            });

            mongoose.connection.on('disconnected', () => {
              console.warn('Desconectado do MongoDB. Tentando reconectar...');
              setTimeout(() => {
                if (mongoose.connection.readyState !== 1) {
                  // Só tenta reconectar se ainda estiver desconectado
                  Database.connect().catch(err => 
                    console.error('Erro ao tentar reconectar:', err.message)
                  );
                }
              }, retryInterval);
            });

            resolve();
          })
          .catch(err => {
            console.error(`❌ Erro ao conectar ao MongoDB (tentativa ${connectionAttempts}/${maxRetries}):`, err.message);
            
            if (connectionAttempts < maxRetries) {
              console.log(`Tentando novamente em ${retryInterval/1000} segundos...`);
              setTimeout(attemptConnection, retryInterval);
            } else {
              console.error('Número máximo de tentativas de conexão atingido');
              
              // Em produção, não queremos que a aplicação falhe completamente
              if (process.env.NODE_ENV === 'production') {
                console.warn('Continuando a execução da aplicação mesmo sem conexão com o banco de dados');
                resolve(); // Resolve mesmo com erro em produção
              } else {
                reject(err);
              }
            }
          });
      };

      // Iniciar a tentativa de conexão
      attemptConnection();
    });
  }

  /**
   * Fecha a conexão com o MongoDB
   * @returns {Promise} Promise resolvida quando a conexão é fechada
   */
  static disconnect() {
    if (mongoose.connection.readyState === 0) {
      console.log('MongoDB já está desconectado');
      return Promise.resolve();
    }
    return mongoose.disconnect()
      .then(() => console.log('Conexão com MongoDB fechada com sucesso'))
      .catch(err => {
        console.error('Erro ao fechar conexão com MongoDB:', err);
        return Promise.reject(err);
      });
  }

  /**
   * Verifica se a conexão com o MongoDB está estabelecida
   * @returns {boolean} True se a conexão está estabelecida, false caso contrário
   */
  static isConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Realiza um health check na conexão com o MongoDB
   * @returns {Promise<boolean>} True se o health check foi bem-sucedido, false caso contrário
   */
  static async healthCheck() {
    try {
      if (!this.isConnected()) {
        console.log('Health check: MongoDB não está conectado');
        return false;
      }
      
      // Executa uma operação simples para verificar se o banco está funcionando
      await mongoose.connection.db.admin().ping();
      console.log('Health check: MongoDB está funcionando corretamente');
      return true;
    } catch (error) {
      console.error('Health check do banco de dados falhou:', error.message);
      return false;
    }
  }
}

module.exports = Database;