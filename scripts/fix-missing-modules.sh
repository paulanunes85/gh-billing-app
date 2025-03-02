#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"

echo -e "${YELLOW}Corrigindo problemas de módulos ausentes para $APP_NAME...${NC}"

# 1. Tornar o script de inicialização executável
chmod +x azure-startup.sh

# 2. Configurar o App Service para usar o script de inicialização personalizado
echo -e "\n${YELLOW}Configurando o App Service para usar o script de inicialização personalizado...${NC}"
az webapp config set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --startup-file "/home/site/wwwroot/azure-startup.sh"

# 3. Configurar as variáveis de ambiente necessárias
echo -e "\n${YELLOW}Configurando as variáveis de ambiente necessárias...${NC}"
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
  WEBSITE_RUN_FROM_PACKAGE="0" \
  SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
  ENABLE_ORYX_BUILD="true" \
  WEBSITES_ENABLE_APP_SERVICE_STORAGE="true" \
  WEBSITES_PORT="8080" \
  PORT="8080" \
  NODE_ENV="production"

# 4. Implantar novamente o web.config e o script de inicialização
echo -e "\n${YELLOW}Implantando arquivos de configuração atualizados...${NC}"
cd /workspaces/gh-billing-app
zip -r deployment.zip web.config azure-startup.sh package.json
az webapp deployment source config-zip --src deployment.zip --name "$APP_NAME" --resource-group "$RESOURCE_GROUP"

# 5. Reiniciar o App Service
echo -e "\n${YELLOW}Reiniciando o App Service...${NC}"
az webapp restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP"

echo -e "\n${GREEN}✓ Configuração concluída${NC}"
echo -e "${YELLOW}O App Service será reiniciado com as novas configurações.${NC}"
echo -e "${YELLOW}Verifique o status da aplicação em:${NC} ${GREEN}https://$APP_NAME.azurewebsites.net${NC}"