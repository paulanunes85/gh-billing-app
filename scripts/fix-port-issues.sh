#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"
APP_URL="https://${APP_NAME}.azurewebsites.net"

echo -e "${YELLOW}Iniciando correção de problemas comuns do App Service $APP_NAME...${NC}"

# 1. Verificar configurações de porta
echo -e "\n${YELLOW}Verificando configurações de porta...${NC}"
WEBSITES_PORT=$(az webapp config appsettings list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "[?name=='WEBSITES_PORT'].value" --output tsv)
PORT=$(az webapp config appsettings list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "[?name=='PORT'].value" --output tsv)

echo -e "WEBSITES_PORT atual: ${WEBSITES_PORT:-'(não definido)'}"
echo -e "PORT atual: ${PORT:-'(não definido)'}"

# 2. Corrigir configurações de porta
echo -e "\n${YELLOW}Configurando variáveis de porta corretamente...${NC}"
az webapp config appsettings set --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --settings WEBSITES_PORT=8080 PORT=8080

# 3. Atualizar startup command para garantir que o Node.js inicie corretamente
echo -e "\n${YELLOW}Configurando comando de inicialização...${NC}"
az webapp config set --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --startup-file "node src/index.js"

# 4. Desativar builtin instrumentações que possam causar conflitos
echo -e "\n${YELLOW}Otimizando configurações de monitoramento...${NC}"
az webapp config appsettings set --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --settings \
  WEBSITE_NODE_DEFAULT_VERSION="~18" \
  NODE_ENV="production" \
  SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
  ENABLE_ORYX_BUILD="true" \
  WEBSITES_ENABLE_APP_SERVICE_STORAGE="true" \
  WEBSITE_RUN_FROM_PACKAGE="0"

# 5. Reiniciar o App Service para aplicar as alterações
echo -e "\n${YELLOW}Reiniciando o App Service...${NC}"
az webapp restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP"

echo -e "\n${YELLOW}Aguardando 30 segundos para o App Service inicializar...${NC}"
sleep 30

# 6. Verificar se está funcionando
echo -e "\n${YELLOW}Verificando se o aplicativo está respondendo...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}/ping")
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✅ Aplicativo está respondendo! Status: $HTTP_CODE${NC}"
else
  echo -e "${RED}❌ Aplicativo ainda não está respondendo. Status: $HTTP_CODE${NC}"
  echo -e "${YELLOW}Tentando verificar logs do aplicativo...${NC}"
  az webapp log tail --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --lines 50 --timeout 30
fi

echo -e "\n${GREEN}✓ Script de correção concluído${NC}"
echo -e "${YELLOW}Você pode verificar o status do aplicativo em:${NC} ${GREEN}$APP_URL${NC}"
echo -e "${YELLOW}Para verificar logs em tempo real:${NC} ${GREEN}az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP${NC}"