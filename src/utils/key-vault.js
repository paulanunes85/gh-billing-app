const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

class KeyVaultService {
    constructor() {
        const keyVaultName = process.env.AZURE_KEY_VAULT_NAME;
        const keyVaultUrl = `https://${keyVaultName}.vault.azure.net`;
        
        // Use DefaultAzureCredential que suporta várias formas de autenticação
        const credential = new DefaultAzureCredential();
        this.secretClient = new SecretClient(keyVaultUrl, credential);
        
        // Cache para os segredos
        this.secretsCache = new Map();
    }

    async getSecret(secretName) {
        try {
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

    async loadSecrets() {
        try {
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