#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"

echo -e "${YELLOW}Corrigindo problemas de implantação para $APP_NAME...${NC}"

# 1. Remover configurações problemáticas
echo -e "\n${YELLOW}Removendo configurações problemáticas de PM2...${NC}"
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
  COMMAND="" \
  PM2_RUNTIME_OPTIONS=""

# 2. Configurar corretamente as configurações de implantação
echo -e "\n${YELLOW}Configurando parâmetros de implantação...${NC}"
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
  WEBSITE_RUN_FROM_PACKAGE="1" \
  ENABLE_ORYX_BUILD="true" \
  SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
  NODE_ENV="production" \
  WEBSITE_NODE_DEFAULT_VERSION="~18" \
  NPM_CONFIG_PRODUCTION="true"

# 3. Configurar comando de inicialização correto
echo -e "\n${YELLOW}Configurando comando de inicialização...${NC}"
az webapp config set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --startup-file "node src/index.js"

# 4. Verificar configuração atual
echo -e "\n${YELLOW}Verificando configuração atual:${NC}"
az webapp config show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "{linuxFxVersion:linuxFxVersion, appCommandLine:appCommandLine}"

echo -e "\n${GREEN}✓ Configurações corrigidas com sucesso${NC}"
echo -e "${YELLOW}As alterações foram aplicadas corretamente. Realize uma nova implantação para testar.${NC}"