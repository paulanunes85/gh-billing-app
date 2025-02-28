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
      
      mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      })
      .then(() => {
        console.log('Conexão com MongoDB estabelecida com sucesso');
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
}

module.exports = Database;