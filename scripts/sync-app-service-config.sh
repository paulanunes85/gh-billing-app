#!/bin/bash

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"
KEY_VAULT_NAME="ghbill-dev-kv"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Sincronizando configurações do App Service com GitHub Actions...${NC}"

# 1. Configurar identidade gerenciada
echo -e "\n${YELLOW}Configurando identidade gerenciada...${NC}"
az webapp identity assign \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --identities [system] \
    --query principalId -o tsv

# 2. Configurar conexão com Key Vault
echo -e "\n${YELLOW}Configurando acesso ao Key Vault...${NC}"
PRINCIPAL_ID=$(az webapp identity show \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query principalId -o tsv)

az role assignment create \
    --assignee-object-id "$PRINCIPAL_ID" \
    --assignee-principal-type ServicePrincipal \
    --role "Key Vault Secrets User" \
    --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME"

# 3. Configurar variáveis de ambiente
echo -e "\n${YELLOW}Configurando variáveis de ambiente...${NC}"
az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --settings \
    ENABLE_ORYX_BUILD="true" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
    WEBSITE_RUN_FROM_PACKAGE="1" \
    NODE_ENV="production" \
    WEBSITE_NODE_DEFAULT_VERSION="~18" \
    NPM_CONFIG_PRODUCTION="true" \
    AZURE_KEY_VAULT_NAME="$KEY_VAULT_NAME"

# 4. Configurar as referências para os segredos do Key Vault
echo -e "\n${YELLOW}Configurando referências para segredos do Key Vault...${NC}"
az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --settings \
    SESSION_SECRET="@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/SessionSecret/)" \
    GITHUB_CLIENT_ID="@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/GitHubClientId/)" \
    GITHUB_CLIENT_SECRET="@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/GitHubClientSecret/)" \
    MONGODB_URI="@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/MongoDbUri/)"

# 5. Configurar aplicação para usar npm ci em produção
echo -e "\n${YELLOW}Configurando npm para produção...${NC}"
az webapp config set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --generic-configurations '{"appCommandLine": "npm ci --production && npm start"}' \
    --linux-fx-version "NODE|18-lts"

# 6. Reiniciar o App Service
echo -e "\n${YELLOW}Reiniciando o App Service...${NC}"
az webapp restart \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME"

echo -e "\n${GREEN}✓ Configuração sincronizada com sucesso${NC}"
echo -e "${YELLOW}O App Service foi reiniciado com as novas configurações.${NC}"
echo -e "${YELLOW}Verifique os logs em: https://${APP_NAME}.scm.azurewebsites.net/api/logs/docker${NC}"