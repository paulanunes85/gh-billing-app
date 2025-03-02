#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"

echo -e "${YELLOW}Corrigindo problemas de porta para $APP_NAME...${NC}"

# 1. Configurar as variáveis de porta
echo -e "\n${YELLOW}Configurando variáveis de porta...${NC}"
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
  WEBSITES_PORT="8080" \
  PORT="8080"

# 2. Restartar o App Service para aplicar as alterações
echo -e "\n${YELLOW}Reiniciando o App Service...${NC}"
az webapp restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP"

# 3. Verificar logs para possíveis erros
echo -e "\n${YELLOW}Verificando logs do App Service (últimas 30 linhas)...${NC}"
sleep 5 # Aguardar um pouco para o App Service reiniciar
az webapp log tail --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --lines 30

echo -e "\n${GREEN}✓ Configurações de porta atualizadas com sucesso${NC}"
echo -e "${YELLOW}Para verificar se a aplicação está respondendo, acesse:${NC}"
echo -e "${GREEN}https://$APP_NAME.azurewebsites.net/health${NC}"