const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

class KeyVaultService {
    constructor() {
        // Inicializar apenas se estiver em ambiente que usa Key Vault
        if (process.env.AZURE_KEY_VAULT_NAME) {
            try {
                const keyVaultName = process.env.AZURE_KEY_VAULT_NAME;
                const keyVaultUrl = `https://${keyVaultName}.vault.azure.net`;
                
                // Use DefaultAzureCredential que suporta várias formas de autenticação
                const credential = new DefaultAzureCredential();
                this.secretClient = new SecretClient(keyVaultUrl, credential);
                
                // Cache para os segredos
                this.secretsCache = new Map();
                console.log(`KeyVault configurado: ${keyVaultUrl}`);
            } catch (error) {
                console.error('Erro ao inicializar KeyVault:', error.message);
                // Não lançar erro para permitir que a aplicação continue em desenvolvimento
            }
        } else {
            console.log('KeyVault não configurado, usando variáveis de ambiente locais');
        }
    }

    async getSecret(secretName) {
        try {
            // Se não estiver em ambiente com KeyVault, retornar ambiente local
            if (!this.secretClient) {
                return process.env[this._mapSecretToEnv(secretName)] || '';
            }

            // Verificar cache primeiro
            if (this.secretsCache.has(secretName)) {
                return this.secretsCache.get(secretName);
            }

            const secret = await this.secretClient.getSecret(secretName);
            // Armazenar no cache
            this.secretsCache.set(secretName, secret.value);
            return secret.value;
        } catch (error) {
            console.error(`Erro ao buscar segredo ${secretName}:`, error.message);
            throw error;
        }
    }

    // Converte nome do segredo no KeyVault para nome de variável de ambiente
    _mapSecretToEnv(secretName) {
        const mapping = {
            'SessionSecret': 'SESSION_SECRET',
            'GitHubClientId': 'GITHUB_CLIENT_ID',
            'GitHubClientSecret': 'GITHUB_CLIENT_SECRET',
            'MongoDbUri': 'MONGODB_URI'
        };
        return mapping[secretName] || secretName;
    }

    async loadSecrets() {
        try {
            // Se não estiver em ambiente com KeyVault, apenas verificar variáveis locais
            if (!this.secretClient) {
                console.log('Usando variáveis de ambiente locais (modo desenvolvimento)');
                return;
            }

            // Carregar todos os segredos necessários
            const [
                sessionSecret,
                githubClientId,
                githubClientSecret,
                mongoDbUri
            ] = await Promise.all([
                this.getSecret('SessionSecret'),
                this.getSecret('GitHubClientId'),
                this.getSecret('GitHubClientSecret'),
                this.getSecret('MongoDbUri')
            ]);

            // Configurar as variáveis de ambiente com os valores do Key Vault
            process.env.SESSION_SECRET = sessionSecret;
            process.env.GITHUB_CLIENT_ID = githubClientId;
            process.env.GITHUB_CLIENT_SECRET = githubClientSecret;
            process.env.MONGODB_URI = mongoDbUri;

            console.log('✅ Segredos carregados do Azure Key Vault com sucesso');
        } catch (error) {
            console.error('❌ Erro ao carregar segredos do Azure Key Vault:', error.message);
            throw error;
        }
    }
}

module.exports = new KeyVaultService();