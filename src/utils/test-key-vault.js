const keyVault = require('./key-vault');

async function testKeyVaultIntegration() {
    console.log('Iniciando teste de integração com Azure Key Vault...\n');

    try {
        // Teste 1: Carregamento inicial de segredos
        console.log('1. Testando carregamento inicial de segredos...');
        await keyVault.loadSecrets();

        // Teste 2: Verificação individual de segredos
        console.log('\n2. Verificando segredos individualmente...');
        const secrets = [
            'SessionSecret',
            'GitHubClientId',
            'GitHubClientSecret',
            'MongoDbUri'
        ];

        for (const secretName of secrets) {
            try {
                const secret = await keyVault.getSecret(secretName);
                console.log(`✅ ${secretName}: Carregado com sucesso`);
                
                // Validação básica do formato do segredo
                switch (secretName) {
                    case 'MongoDbUri':
                        if (!secret.startsWith('mongodb://') && !secret.startsWith('mongodb+srv://')) {
                            console.log(`⚠️ ${secretName}: Formato possivelmente inválido`);
                        }
                        break;
                    case 'GitHubClientId':
                        if (secret.length < 10) {
                            console.log(`⚠️ ${secretName}: Formato possivelmente inválido`);
                        }
                        break;
                }
            } catch (error) {
                console.error(`❌ ${secretName}: ${error.message}`);
            }
        }

        console.log('\n3. Verificando variáveis de ambiente...');
        const envVars = [
            'SESSION_SECRET',
            'GITHUB_CLIENT_ID',
            'GITHUB_CLIENT_SECRET',
            'MONGODB_URI'
        ];

        envVars.forEach(varName => {
            if (process.env[varName]) {
                console.log(`✅ ${varName}: Configurado`);
            } else {
                console.log(`❌ ${varName}: Não configurado`);
            }
        });

    } catch (error) {
        console.error('\n❌ Erro nos testes:', error.message);
        if (error.code === 'ENOTFOUND') {
            console.log('\nDica: Verifique se o nome do Key Vault está correto em AZURE_KEY_VAULT_NAME');
        }
        if (error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
            console.log('\nDica: Problema com certificados SSL. Verifique sua conexão e certificados.');
        }
        if (error.message && error.message.includes('AADSTS700016')) {
            console.log('\nDica: Problema com autenticação. Verifique suas credenciais do Azure.');
        }
    }
}

// Executar os testes
testKeyVaultIntegration().catch(console.error);