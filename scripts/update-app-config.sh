#!/bin/bash

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"
KEY_VAULT_NAME="ghbill-dev-kv"
APP_URL="https://${APP_NAME}.azurewebsites.net"
GITHUB_CALLBACK_PATH="/api/auth/github/callback"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Atualizando configurações do App Service para uso do Key Vault...${NC}"

# Verificar se o App Service existe
if ! az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo -e "${RED}Erro: App Service '$APP_NAME' não encontrado no grupo de recursos '$RESOURCE_GROUP'${NC}"
    exit 1
fi

# Verificar se o Key Vault existe
if ! az keyvault show --name "$KEY_VAULT_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo -e "${RED}Erro: Key Vault '$KEY_VAULT_NAME' não encontrado no grupo de recursos '$RESOURCE_GROUP'${NC}"
    exit 1
fi

# 1. Adicionar o GitHub Callback URL como um segredo no Key Vault
echo -e "\n${YELLOW}Configurando o GitHub Callback URL no Key Vault...${NC}"
CALLBACK_URL="${APP_URL}${GITHUB_CALLBACK_PATH}"

if az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "GitHubCallbackUrl" --value "$CALLBACK_URL" &>/dev/null; then
    echo -e "${GREEN}✓ Segredo 'GitHubCallbackUrl' configurado com sucesso: $CALLBACK_URL${NC}"
else
    echo -e "${RED}✗ Erro ao configurar o segredo 'GitHubCallbackUrl'${NC}"
    exit 1
fi

# 2. Atualizar as configurações do App Service para usar referências ao Key Vault
echo -e "\n${YELLOW}Atualizando configurações do App Service...${NC}"

# Configurar o App Service para usar a identidade gerenciada
echo -e "${YELLOW}Configurando a identidade gerenciada do App Service...${NC}"
if az webapp identity assign --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --output none; then
    echo -e "${GREEN}✓ Identidade gerenciada configurada com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao configurar identidade gerenciada${NC}"
    exit 1
fi

# Obter o principal ID da identidade gerenciada
PRINCIPAL_ID=$(az webapp identity show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query principalId --output tsv)

# 3. Atribuir a permissão "Key Vault Secrets User" para a identidade gerenciada
echo -e "${YELLOW}Atribuindo permissão 'Key Vault Secrets User' para a identidade gerenciada...${NC}"
KEYVAULT_ID=$(az keyvault show --name "$KEY_VAULT_NAME" --resource-group "$RESOURCE_GROUP" --query id --output tsv)

if az role assignment create --assignee "$PRINCIPAL_ID" --role "Key Vault Secrets User" --scope "$KEYVAULT_ID" --output none; then
    echo -e "${GREEN}✓ Permissão atribuída com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao atribuir permissão${NC}"
    exit 1
fi

# 4. Atualizar as configurações do App Service
echo -e "${YELLOW}Atualizando as configurações do App Service para usar o Key Vault...${NC}"

az webapp config appsettings set --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --settings \
AZURE_KEY_VAULT_NAME="$KEY_VAULT_NAME" \
NODE_ENV="production" \
GITHUB_CALLBACK_URL="@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/GitHubCallbackUrl/)" \
SESSION_SECRET="@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/SessionSecret/)" \
GITHUB_CLIENT_ID="@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/GitHubClientId/)" \
GITHUB_CLIENT_SECRET="@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/GitHubClientSecret/)" \
MONGODB_URI="@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/MongoDbUri/)" \
GITHUB_COPILOT_API_KEY="@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/GitHubCopilotApiKey/)" \
--output none

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Configurações do App Service atualizadas com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao atualizar configurações do App Service${NC}"
    exit 1
fi

# 5. Reiniciar o App Service para aplicar as alterações
echo -e "\n${YELLOW}Reiniciando o App Service para aplicar as alterações...${NC}"
if az webapp restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --output none; then
    echo -e "${GREEN}✓ App Service reiniciado com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao reiniciar o App Service${NC}"
    exit 1
fi

echo -e "\n${GREEN}===== Configuração do App Service concluída =====${NC}"
echo -e "${YELLOW}O App Service agora está configurado para usar segredos do Key Vault.${NC}"
echo -e "${YELLOW}URL da aplicação: ${APP_URL}${NC}"
echo -e "${YELLOW}GitHub Callback URL: ${CALLBACK_URL}${NC}"
echo -e "\n${YELLOW}Importante: Certifique-se de atualizar a configuração do OAuth App no GitHub com o Callback URL correto.${NC}"