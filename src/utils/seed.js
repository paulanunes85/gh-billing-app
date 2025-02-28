/**
 * Script para popular o banco de dados com dados de exemplo
 * Uso: npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('../models/organization.model');
const Billing = require('../models/billing.model');
const User = require('../models/user.model');
const moment = require('moment');

// Configuração da conexão com o MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gh-billing-app';

// Dados de exemplo para organizações
const organizationsSeed = [
  {
    name: 'Acme Corporation',
    githubId: '12345678',
    login: 'acme-corp',
    avatarUrl: 'https://avatars.githubusercontent.com/u/12345678',
    accessToken: 'github_pat_sample_token_1234567890',
  },
  {
    name: 'TechSolutions Inc',
    githubId: '87654321',
    login: 'tech-solutions',
    avatarUrl: 'https://avatars.githubusercontent.com/u/87654321',
    accessToken: 'github_pat_sample_token_0987654321',
  },
  {
    name: 'DevOps Experts',
    githubId: '13579246',
    login: 'devops-experts',
    avatarUrl: 'https://avatars.githubusercontent.com/u/13579246',
    accessToken: 'github_pat_sample_token_1357924680',
  }
];

// Função para gerar dados de faturamento para cada organização
const generateBillingData = (organizations) => {
  const billingData = [];
  const months = ['January', 'February', 'March', 'April', 'May', 'June'];
  const currentYear = new Date().getFullYear();
  
  organizations.forEach(org => {
    months.forEach((month, index) => {
      // Último mês tem status pendente, outros são pagos
      const status = index === months.length - 1 ? 'pending' : 'paid';
      
      // Aumenta o valor gradualmente para mostrar tendência de crescimento
      const baseAmount = 100 + (index * 20);
      // Valor aleatório para variação entre organizações
      const randomFactor = 0.8 + (Math.random() * 0.4);
      const totalAmount = baseAmount * randomFactor;
      
      // Data do faturamento (final do mês)
      const billingDate = moment().year(currentYear).month(index).endOf('month');
      
      // Data de pagamento (para faturas pagas)
      const paidAt = status === 'paid' ? 
        moment().year(currentYear).month(index).add(15, 'days') : null;
        
      // Detalhes de uso por usuário (simulados)
      const usageBreakdown = [];
      const userCount = 3 + Math.floor(Math.random() * 5); // 3-7 usuários
      
      for (let i = 1; i <= userCount; i++) {
        const username = `user${i}_${org.login}`;
        const userId = `${i}${org.githubId.substring(0, 5)}`;
        const usageMinutes = Math.floor(50 + Math.random() * 250); // 50-300 minutos
        const cost = (usageMinutes / 60) * 10; // $10 por hora
        
        usageBreakdown.push({
          username,
          userId,
          usageMinutes,
          cost
        });
      }
      
      billingData.push({
        organization: org._id,
        month,
        year: currentYear,
        totalAmount,
        currency: 'USD',
        usageBreakdown,
        billingDate: billingDate.toDate(),
        paidAt: paidAt ? paidAt.toDate() : null,
        status,
        createdAt: billingDate.subtract(2, 'days').toDate(),
        updatedAt: status === 'paid' ? 
          paidAt.toDate() : billingDate.toDate()
      });
    });
  });
  
  return billingData;
};

// Dados de exemplo para usuários
const usersSeed = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'hashed_password_here', // Na implementação real, usaríamos bcrypt
    role: 'admin',
    avatarUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
    lastLogin: new Date()
  },
  {
    name: 'Manager User',
    email: 'manager@example.com',
    password: 'hashed_password_here',
    role: 'manager',
    avatarUrl: 'https://randomuser.me/api/portraits/women/2.jpg',
    lastLogin: new Date()
  },
  {
    name: 'Viewer User',
    email: 'viewer@example.com',
    password: 'hashed_password_here',
    role: 'viewer',
    avatarUrl: 'https://randomuser.me/api/portraits/men/3.jpg',
    lastLogin: new Date()
  }
];

// Função principal para popular o banco de dados
async function seedDatabase() {
  try {
    // Conecta ao MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Conexão com MongoDB estabelecida para seed');
    
    // Limpa dados existentes
    await Promise.all([
      Organization.deleteMany({}),
      Billing.deleteMany({}),
      User.deleteMany({})
    ]);
    console.log('Dados existentes removidos');
    
    // Insere organizações
    const orgs = await Organization.insertMany(organizationsSeed);
    console.log(`${orgs.length} organizações inseridas`);
    
    // Gera e insere dados de faturamento
    const billingRecords = generateBillingData(orgs);
    await Billing.insertMany(billingRecords);
    console.log(`${billingRecords.length} registros de faturamento inseridos`);
    
    // Insere usuários
    await User.insertMany(usersSeed);
    console.log(`${usersSeed.length} usuários inseridos`);
    
    console.log('Seed concluído com sucesso!');
    console.log('\nCredenciais de demonstração:');
    console.log('Admin: admin@example.com / senha');
    console.log('Manager: manager@example.com / senha');
    console.log('Viewer: viewer@example.com / senha');
  } catch (error) {
    console.error('Erro durante o seed:', error);
  } finally {
    // Fecha a conexão
    await mongoose.connection.close();
    console.log('Conexão com MongoDB fechada');
  }
}

// Executa a função de seed
seedDatabase();