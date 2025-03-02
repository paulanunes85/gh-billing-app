#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"

echo -e "${YELLOW}Iniciando implantação completa para $APP_NAME...${NC}"

# 1. Preparar ambiente local
echo -e "\n${YELLOW}Preparando ambiente local...${NC}"
cd /workspaces/gh-billing-app

# Instalar dependências localmente para incluir no deploy
echo -e "\n${YELLOW}Instalando dependências...${NC}"
npm install --production

# 2. Configurar variáveis de ambiente temporárias para desenvolvimento
echo -e "\n${YELLOW}Configurando variáveis de ambiente temporárias...${NC}"
cat > .env << EOF
SESSION_SECRET=temporary-dev-session-secret
GITHUB_CLIENT_ID=temp-client-id
GITHUB_CLIENT_SECRET=temp-client-secret
MONGODB_URI=mongodb://localhost:27017/ghbilling
PORT=8080
NODE_ENV=production
EOF

# 3. Criar package de deploy completo
echo -e "\n${YELLOW}Criando pacote de implantação completo...${NC}"
zip -r full-deploy.zip . \
  -x ".git/*" \
  -x ".github/*" \
  -x ".env" \
  -x "tests/*"

# 4. Configurar o App Service
echo -e "\n${YELLOW}Configurando o App Service...${NC}"

# Configurar para NÃO usar package mode
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
  WEBSITE_RUN_FROM_PACKAGE="0" \
  WEBSITES_ENABLE_APP_SERVICE_STORAGE="true" \
  WEBSITES_PORT="8080" \
  PORT="8080" \
  NODE_ENV="production"

# Configurar comando de inicialização para simplesmente executar o node
az webapp config set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --startup-file "node src/index.js"

# 5. Fazer o deploy do pacote completo
echo -e "\n${YELLOW}Realizando deploy do pacote completo...${NC}"
az webapp deployment source config-zip \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --src full-deploy.zip

# 6. Configurar as variáveis de ambiente corretas do Key Vault
echo -e "\n${YELLOW}Configurando variáveis de ambiente do Key Vault...${NC}"
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
  AZURE_KEY_VAULT_NAME="ghbill-dev-kv" \
  MONGODB_URI="@Microsoft.KeyVault(SecretUri=https://ghbill-dev-kv.vault.azure.net/secrets/MongoDbUri/)" \
  SESSION_SECRET="@Microsoft.KeyVault(SecretUri=https://ghbill-dev-kv.vault.azure.net/secrets/SessionSecret/)" \
  GITHUB_CLIENT_ID="@Microsoft.KeyVault(SecretUri=https://ghbill-dev-kv.vault.azure.net/secrets/GitHubClientId/)" \
  GITHUB_CLIENT_SECRET="@Microsoft.KeyVault(SecretUri=https://ghbill-dev-kv.vault.azure.net/secrets/GitHubClientSecret/)" \
  GITHUB_CALLBACK_URL="@Microsoft.KeyVault(SecretUri=https://ghbill-dev-kv.vault.azure.net/secrets/GitHubCallbackUrl/)"

# 7. Reiniciar o App Service para aplicar todas as mudanças
echo -e "\n${YELLOW}Reiniciando o App Service...${NC}"
az webapp restart \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP"

echo -e "\n${GREEN}✓ Implantação completa finalizada${NC}"
echo -e "${YELLOW}A aplicação deve estar acessível em:${NC} ${GREEN}https://$APP_NAME.azurewebsites.net${NC}"
echo -e "${YELLOW}Se a aplicação ainda não estiver funcionando, verifique os logs no portal do Azure.${NC}"