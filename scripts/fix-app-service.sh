#!/bin/bash

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando configuração do App Service...${NC}"

# 1. Habilitando logs detalhados
echo -e "\n${YELLOW}Habilitando logs detalhados...${NC}"
az webapp log config \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --web-server-logging filesystem \
    --docker-container-logging filesystem \
    --detailed-error-messages true \
    --failed-request-tracing true

# 2. Configurando o ambiente de build e runtime
echo -e "\n${YELLOW}Configurando ambiente de build e runtime...${NC}"
az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --settings \
    ENABLE_ORYX_BUILD="true" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
    WEBSITE_RUN_FROM_PACKAGE="0" \
    NODE_ENV="production" \
    BUILD_FLAGS="--production" \
    WEBSITE_NODE_DEFAULT_VERSION="~18" \
    NPM_CONFIG_PREFIX="/home/site/wwwroot/node_modules" \
    NPM_CONFIG_CACHE="/home/site/wwwroot/node_modules/.cache" \
    PATH="/home/site/wwwroot/node_modules/.bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    POST_BUILD_SCRIPT="npm rebuild" \
    WEBSITE_HTTPLOGGING_RETENTION_DAYS="7"

# 3. Configurando o runtime e startup command
echo -e "\n${YELLOW}Configurando runtime e startup command...${NC}"
az webapp config set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --linux-fx-version "NODE|18-lts" \
    --generic-configurations '{"appCommandLine": "npm install --production --no-optional && npm start"}' \
    --always-on true \
    --min-tls-version 1.2 \
    --http20-enabled true

# 4. Limpando a instalação atual
echo -e "\n${YELLOW}Limpando a instalação atual...${NC}"
az webapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --src /dev/null

# 5. Reiniciando o App Service
echo -e "\n${YELLOW}Reiniciando o App Service...${NC}"
az webapp restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP"

echo -e "\n${GREEN}✓ Configuração concluída${NC}"
echo -e "${YELLOW}O App Service será reiniciado com as novas configurações.${NC}"
echo -e "${YELLOW}Você pode verificar os logs no portal do Azure ou usar o Kudu console em https://${APP_NAME}.scm.azurewebsites.net${NC}"