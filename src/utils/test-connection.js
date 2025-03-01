const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

async function testConnections() {
    console.log('Iniciando testes de conexão...\n');

    // Teste de conexão com MongoDB
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conexão com MongoDB: OK');
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Erro na conexão com MongoDB:', error.message);
    }

    // Teste de conexão com GitHub API
    try {
        const response = await axios.get('https://api.github.com', {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        console.log('✅ Conexão com GitHub API: OK');
    } catch (error) {
        console.error('❌ Erro na conexão com GitHub API:', error.message);
    }

    // Teste de configurações OAuth do GitHub
    const requiredEnvVars = [
        'GITHUB_CLIENT_ID',
        'GITHUB_CLIENT_SECRET',
        'GITHUB_CALLBACK_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
        console.log('✅ Configurações OAuth do GitHub: OK');
    } else {
        console.error('❌ Configurações OAuth do GitHub ausentes:', missingVars.join(', '));
    }

    // Teste de configurações do Azure
    if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
        console.log('✅ Application Insights: Configurado');
    } else {
        console.log('⚠️ Application Insights: Não configurado');
    }

    // Teste de configurações de segurança
    console.log('\nValidando configurações de segurança:');
    console.log('- SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Configurado' : '❌ Não configurado');
    console.log('- CORS_ORIGIN:', process.env.CORS_ORIGIN ? '✅ Configurado' : '⚠️ Usando padrão "*"');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
}

testConnections().catch(console.error);