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
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gh-billing-app';
      const dbName = process.env.DB_NAME || 'gh-billing-app';
      
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: dbName,
        retryWrites: true,
        w: 'majority',
        retryReads: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
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

      mongoose.connect(mongoURI, options)
        .then(() => {
          console.log(`Conexão com MongoDB estabelecida com sucesso (${process.env.NODE_ENV || 'development'})`);
          
          // Configurar event listeners para monitorar a conexão
          mongoose.connection.on('error', (err) => {
            console.error('Erro na conexão MongoDB:', err);
          });

          mongoose.connection.on('disconnected', () => {
            console.warn('Desconectado do MongoDB. Tentando reconectar...');
            setTimeout(() => Database.connect(), 5000);
          });

          resolve();
        })
        .catch(err => {
          console.error('Erro ao conectar ao MongoDB:', err);
          reject(err);
        });
    });
  }

  /**
   * Fecha a conexão com o MongoDB
   * @returns {Promise} Promise resolvida quando a conexão é fechada
   */
  static disconnect() {
    return mongoose.disconnect();
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
        throw new Error('Database is not connected');
      }
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

module.exports = Database;