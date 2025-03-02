#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"
KEY_VAULT_NAME="ghbill-dev-kv"

echo -e "${YELLOW}Configurando acesso ao Key Vault para o App Service $APP_NAME...${NC}"

# 1. Verificar se a identidade gerenciada está ativada
echo -e "\n${YELLOW}Verificando se a identidade gerenciada está ativada...${NC}"
IDENTITY_STATUS=$(az webapp identity show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "principalId" --output tsv 2>/dev/null)

if [ -z "$IDENTITY_STATUS" ]; then
    echo -e "${RED}Identidade gerenciada não está ativada para o App Service. Ativando...${NC}"
    
    # Ativar a identidade gerenciada
    IDENTITY_RESULT=$(az webapp identity assign --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --output json)
    PRINCIPAL_ID=$(echo $IDENTITY_RESULT | jq -r '.principalId')
    
    if [ -z "$PRINCIPAL_ID" ] || [ "$PRINCIPAL_ID" == "null" ]; then
        echo -e "${RED}Falha ao ativar a identidade gerenciada. Verifique as permissões na assinatura do Azure.${NC}"
        exit 1
    else
        echo -e "${GREEN}Identidade gerenciada ativada com sucesso. ID: $PRINCIPAL_ID${NC}"
    fi
else
    echo -e "${GREEN}Identidade gerenciada já está ativada. ID: $IDENTITY_STATUS${NC}"
    PRINCIPAL_ID=$IDENTITY_STATUS
fi

# 2. Verificar se o Key Vault existe
echo -e "\n${YELLOW}Verificando se o Key Vault $KEY_VAULT_NAME existe...${NC}"
KEY_VAULT_ID=$(az keyvault show --name "$KEY_VAULT_NAME" --resource-group "$RESOURCE_GROUP" --query "id" --output tsv 2>/dev/null)

if [ -z "$KEY_VAULT_ID" ]; then
    echo -e "${RED}Key Vault $KEY_VAULT_NAME não encontrado no grupo de recursos $RESOURCE_GROUP.${NC}"
    exit 1
else
    echo -e "${GREEN}Key Vault encontrado: $KEY_VAULT_ID${NC}"
fi

# 3. Conceder permissões de acesso ao Key Vault
echo -e "\n${YELLOW}Concedendo permissões de acesso ao Key Vault para o App Service...${NC}"
az keyvault set-policy --name "$KEY_VAULT_NAME" \
    --object-id "$PRINCIPAL_ID" \
    --secret-permissions get list \
    --resource-group "$RESOURCE_GROUP"

echo -e "${GREEN}✅ Permissões concedidas com sucesso.${NC}"

# 4. Restringir o acesso ao Key Vault apenas para a rede da Azure
echo -e "\n${YELLOW}Deseja ativar regras de firewall para o Key Vault? (s/n)${NC}"
read -r FIREWALL_RESP

if [[ "$FIREWALL_RESP" =~ ^([sS][iI]|[sS])$ ]]; then
    echo -e "${YELLOW}Configurando regras de firewall para o Key Vault...${NC}"
    
    # Obter o IP público do App Service
    echo -e "${YELLOW}Obtendo informações de rede do App Service...${NC}"
    APP_OUTBOUND_IPS=$(az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "outboundIpAddresses" --output tsv)
    
    # Configurar regras de firewall para o Key Vault
    echo -e "${YELLOW}Configurando regras de firewall para permitir apenas acesso da Azure e do App Service...${NC}"
    az keyvault update --name "$KEY_VAULT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --default-action Deny \
        --bypass AzureServices
    
    # Adicionar IPs do App Service
    IFS=',' read -ra IP_ARRAY <<< "$APP_OUTBOUND_IPS"
    for IP in "${IP_ARRAY[@]}"; do
        echo -e "${YELLOW}Adicionando IP $IP às regras de firewall...${NC}"
        az keyvault network-rule add --name "$KEY_VAULT_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --ip-address "$IP"
    done
    
    echo -e "${GREEN}✅ Regras de firewall configuradas com sucesso.${NC}"
else
    echo -e "${YELLOW}Nenhuma restrição de firewall será aplicada ao Key Vault.${NC}"
fi

# 5. Atualizar as configurações do App Service
echo -e "\n${YELLOW}Atualizando configurações de variáveis de ambiente do App Service...${NC}"
az webapp config appsettings set --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
    --settings \
    "AZURE_KEY_VAULT_NAME=$KEY_VAULT_NAME" \
    "MONGODB_URI=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/MongoDbUri/)" \
    "SESSION_SECRET=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/SessionSecret/)" \
    "GITHUB_CLIENT_ID=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/GitHubClientId/)" \
    "GITHUB_CLIENT_SECRET=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/GitHubClientSecret/)" \
    "GITHUB_CALLBACK_URL=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/GitHubCallbackUrl/)"

echo -e "${GREEN}✅ Configurações do App Service atualizadas com sucesso.${NC}"

# 6. Reinicie o App Service para aplicar as alterações
echo -e "\n${YELLOW}Reiniciando o App Service...${NC}"
az webapp restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP"

echo -e "\n${GREEN}✓ Configuração concluída${NC}"
echo -e "${YELLOW}O App Service foi configurado para acessar o Key Vault usando identidade gerenciada.${NC}"
echo -e "${YELLOW}Verifique se o App Service está funcionando corretamente em:${NC} ${GREEN}https://$APP_NAME.azurewebsites.net${NC}"