const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

class KeyVaultService {
    constructor() {
        this.isInitialized = false;
        this.secretsCache = new Map();
        
        // Inicializar apenas se estiver em ambiente que usa Key Vault
        if (process.env.AZURE_KEY_VAULT_NAME) {
            try {
                const keyVaultName = process.env.AZURE_KEY_VAULT_NAME;
                const keyVaultUrl = `https://${keyVaultName}.vault.azure.net`;
                
                console.log(`Tentando inicializar o Key Vault: ${keyVaultUrl}`);
                
                // Use DefaultAzureCredential que suporta várias formas de autenticação
                const credential = new DefaultAzureCredential({
                    // Mais detalhes de logs para diagnóstico
                    loggingOptions: { 
                        allowLoggingAccountIdentifiers: true 
                    }
                });
                
                this.secretClient = new SecretClient(keyVaultUrl, credential);
                this.isInitialized = true;
                console.log(`KeyVault configurado: ${keyVaultUrl}`);
            } catch (error) {
                console.error('Erro ao inicializar KeyVault:', error.message);
                console.error(error.stack);
                // Não lançar erro para permitir que a aplicação continue
                this.isInitialized = false;
            }
        } else {
            console.log('KeyVault não configurado, usando variáveis de ambiente locais');
        }
    }

    async getSecret(secretName) {
        try {
            // Se não estiver em ambiente com KeyVault, retornar ambiente local
            if (!this.isInitialized || !this.secretClient) {
                console.log(`KeyVault não inicializado, usando variável de ambiente para ${secretName}`);
                return process.env[this._mapSecretToEnv(secretName)] || '';
            }
            
            // Verificar cache primeiro
            if (this.secretsCache.has(secretName)) {
                return this.secretsCache.get(secretName);
            }
            
            console.log(`Buscando segredo ${secretName} do Key Vault...`);
            const secret = await this.secretClient.getSecret(secretName);
            
            // Armazenar no cache
            this.secretsCache.set(secretName, secret.value);
            console.log(`Segredo ${secretName} obtido com sucesso`);
            return secret.value;
        } catch (error) {
            console.error(`Erro ao buscar segredo ${secretName}:`, error.message);
            console.error(error.stack);
            
            // Em caso de erro, tentar usar a variável de ambiente como fallback
            const envVar = process.env[this._mapSecretToEnv(secretName)];
            if (envVar) {
                console.log(`Usando variável de ambiente como fallback para ${secretName}`);
                return envVar;
            }
            
            throw new Error(`Não foi possível obter o segredo ${secretName} do Key Vault nem das variáveis de ambiente`);
        }
    }

    // Converte nome do segredo no KeyVault para nome de variável de ambiente
    _mapSecretToEnv(secretName) {
        const mapping = {
            'SessionSecret': 'SESSION_SECRET',
            'GitHubClientId': 'GITHUB_CLIENT_ID',
            'GitHubClientSecret': 'GITHUB_CLIENT_SECRET',
            'MongoDbUri': 'MONGODB_URI',
            'GitHubCallbackUrl': 'GITHUB_CALLBACK_URL'
        };
        return mapping[secretName] || secretName;
    }

    async loadSecrets() {
        try {
            // Se não estiver em ambiente com KeyVault ou não estiver inicializado, apenas verificar variáveis locais
            if (!this.isInitialized || !this.secretClient) {
                console.log('Key Vault não está inicializado. Usando variáveis de ambiente existentes.');
                return;
            }
            
            console.log('Tentando carregar segredos do Key Vault...');
            
            // Lista para armazenar todas as promessas
            const secretPromises = [];
            const secretNames = ['SessionSecret', 'GitHubClientId', 'GitHubClientSecret', 'MongoDbUri', 'GitHubCallbackUrl'];
            
            // Criar todas as promessas
            for (const secretName of secretNames) {
                secretPromises.push(
                    this.getSecret(secretName)
                        .then(value => ({ name: secretName, value }))
                        .catch(error => {
                            console.warn(`Não foi possível carregar o segredo ${secretName}: ${error.message}`);
                            return { name: secretName, value: null };
                        })
                );
            }
            
            // Executar todas as promessas
            const results = await Promise.all(secretPromises);
            
            // Processar os resultados
            for (const result of results) {
                if (result.value) {
                    const envName = this._mapSecretToEnv(result.name);
                    process.env[envName] = result.value;
                    console.log(`✅ Segredo ${result.name} carregado para ${envName}`);
                }
            }
            
            console.log('✅ Processo de carregamento de segredos do Azure Key Vault finalizado');
        } catch (error) {
            console.error('❌ Erro ao carregar segredos do Azure Key Vault:', error.message);
            console.error(error.stack);
            console.log('Continuando com as variáveis de ambiente existentes...');
            // Não lança o erro para permitir que a aplicação continue mesmo com falhas no Key Vault
        }
    }
}

module.exports = new KeyVaultService();