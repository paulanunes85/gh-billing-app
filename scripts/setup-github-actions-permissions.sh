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

echo -e "${YELLOW}Configurando permissões RBAC para GitHub Actions...${NC}"

# 1. Obter o principal ID do App Service
echo -e "\n${YELLOW}Obtendo principal ID do App Service...${NC}"
APP_PRINCIPAL_ID=$(az webapp identity show \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query principalId \
    --output tsv)

if [ -z "$APP_PRINCIPAL_ID" ]; then
    echo -e "${RED}Erro: Não foi possível obter o principal ID do App Service${NC}"
    exit 1
fi

# 2. Configurar permissões do Key Vault
echo -e "\n${YELLOW}Configurando permissões do Key Vault...${NC}"
az role assignment create \
    --assignee "$APP_PRINCIPAL_ID" \
    --role "Key Vault Secrets User" \
    --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME"

# 3. Configurar permissões do App Service
echo -e "\n${YELLOW}Configurando permissões do App Service...${NC}"
az role assignment create \
    --assignee "$APP_PRINCIPAL_ID" \
    --role "Website Contributor" \
    --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME"

# 4. Configurar permissões para o Resource Group
echo -e "\n${YELLOW}Configurando permissões do Resource Group...${NC}"
az role assignment create \
    --assignee "$APP_PRINCIPAL_ID" \
    --role "Reader" \
    --resource-group "$RESOURCE_GROUP"

echo -e "\n${GREEN}✓ Permissões configuradas com sucesso${NC}"
echo -e "${YELLOW}O GitHub Actions agora tem as permissões necessárias para:${NC}"
echo -e "  - Acessar segredos do Key Vault"
echo -e "  - Gerenciar o App Service"
echo -e "  - Ler recursos do Resource Group"

# 5. Verificar permissões configuradas
echo -e "\n${YELLOW}Verificando permissões configuradas:${NC}"
az role assignment list \
    --assignee "$APP_PRINCIPAL_ID" \
    --resource-group "$RESOURCE_GROUP" \
    --output table