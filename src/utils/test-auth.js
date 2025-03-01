const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

async function testGitHubAuth(accessToken) {
    const api = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    try {
        // Teste 1: Verificar usuário autenticado
        console.log('\nTestando acesso do usuário...');
        const userResponse = await api.get('/user');
        console.log('✅ Acesso do usuário: OK');
        console.log(`   Login: ${userResponse.data.login}`);

        // Teste 2: Verificar organizações
        console.log('\nTestando acesso às organizações...');
        const orgsResponse = await api.get('/user/orgs');
        console.log('✅ Acesso às organizações: OK');
        console.log(`   Organizações encontradas: ${orgsResponse.data.length}`);
        
        // Teste 3: Para cada organização, testar acesso ao Copilot
        console.log('\nTestando acesso ao Copilot em cada organização...');
        for (const org of orgsResponse.data) {
            try {
                const copilotResponse = await api.get(`/orgs/${org.login}/copilot/billing`);
                console.log(`✅ Acesso ao Copilot em ${org.login}: OK`);
            } catch (error) {
                console.log(`❌ Acesso ao Copilot em ${org.login}: Falhou - ${error.response?.status || error.message}`);
            }
        }

        // Teste 4: Verificar escopos do token
        console.log('\nVerificando escopos do token...');
        const scopesResponse = await api.get('/user');
        const scopes = scopesResponse.headers['x-oauth-scopes'] || '';
        console.log('Escopos disponíveis:', scopes);
        
        const requiredScopes = ['user:email', 'read:org'];
        const hasAllScopes = requiredScopes.every(scope => scopes.includes(scope));
        
        if (hasAllScopes) {
            console.log('✅ Todos os escopos necessários estão presentes');
        } else {
            console.log('❌ Faltam alguns escopos necessários');
            console.log('   Escopos necessários:', requiredScopes.join(', '));
        }

    } catch (error) {
        console.error('\n❌ Erro nos testes:', error.response?.data || error.message);
    }
}

// Para usar este script, você precisa fornecer um token de acesso válido
if (process.argv[2]) {
    testGitHubAuth(process.argv[2]);
} else {
    console.log('Por favor, forneça um token de acesso como argumento:');
    console.log('node test-auth.js <seu-token-de-acesso>');
}