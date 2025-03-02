#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"

echo -e "${YELLOW}Iniciando verificação completa do App Service $APP_NAME...${NC}"

# 1. Verificar status do App Service
echo -e "\n${YELLOW}Verificando status do App Service...${NC}"
az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query "{name:name,state:state,enabled:enabled,defaultHostName:defaultHostName}" \
  --output table

# 2. Verificar configurações do App Service
echo -e "\n${YELLOW}Verificando configurações do App Service...${NC}"
az webapp config show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query "{linuxFxVersion:linuxFxVersion,appCommandLine:appCommandLine,alwaysOn:alwaysOn}" \
  --output table

# 3. Verificar variáveis de ambiente
echo -e "\n${YELLOW}Verificando variáveis de ambiente críticas...${NC}"
echo "Verificando WEBSITES_PORT, PORT, NODE_ENV, etc."
az webapp config appsettings list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query "[?name=='WEBSITES_PORT' || name=='PORT' || name=='NODE_ENV' || name=='WEBSITE_NODE_DEFAULT_VERSION' || name=='WEBSITE_RUN_FROM_PACKAGE' || name=='SCM_DO_BUILD_DURING_DEPLOYMENT']" \
  --output table

# 4. Verificar logs recentes (últimas 100 linhas)
echo -e "\n${YELLOW}Verificando logs recentes (podem não aparecer se houver problema de conexão)...${NC}"
az webapp log tail --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --lines 100 2>/dev/null || echo -e "${RED}Não foi possível acessar logs diretamente. Verifique no portal do Azure.${NC}"

# 5. Verificar se o site está respondendo
echo -e "\n${YELLOW}Verificando se o site está respondendo...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$APP_NAME.azurewebsites.net/ping 2>/dev/null || echo "Falha")
if [ "$HTTP_STATUS" == "200" ]; then
  echo -e "${GREEN}Site respondeu com status HTTP 200 OK${NC}"
else
  echo -e "${RED}Site não respondeu corretamente. Status: $HTTP_STATUS${NC}"
  echo "Verificando endpoint de saúde /health..."
  curl -s -o /dev/null -w "%{http_code}" https://$APP_NAME.azurewebsites.net/health 2>/dev/null || echo "Falha no endpoint /health"
fi

# 6. Verificar restrições de IP
echo -e "\n${YELLOW}Verificando restrições de IP...${NC}"
az webapp config access-restriction show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query "ipSecurityRestrictions" --output table

# 7. Verificar problemas comuns de configuração
echo -e "\n${YELLOW}Verificando problemas comuns de configuração...${NC}"
# Verificar se a configuração WEBSITE_RUN_FROM_PACKAGE é compatível com node_modules
RUN_FROM_PKG=$(az webapp config appsettings list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query "[?name=='WEBSITE_RUN_FROM_PACKAGE'].value" --output tsv)

if [ "$RUN_FROM_PKG" == "1" ]; then
  echo -e "${YELLOW}WEBSITE_RUN_FROM_PACKAGE está definido como 1. Verifique se o pacote de implantação contém o diretório node_modules ou se as dependências são instaladas durante a implantação.${NC}"
else
  echo -e "${GREEN}WEBSITE_RUN_FROM_PACKAGE não está definido para usar um pacote zip. O diretório node_modules no App Service será usado.${NC}"
fi

echo -e "\n${YELLOW}Teste de reinicialização do App Service...${NC}"
echo -e "${YELLOW}Deseja reiniciar o App Service? (s/n)${NC}"
read -r resposta
if [[ "$resposta" =~ ^([sS][iI]|[sS])$ ]]; then
  echo -e "${YELLOW}Reiniciando o App Service...${NC}"
  az webapp restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP"
  echo -e "${GREEN}App Service reiniciado.${NC}"
  
  echo -e "${YELLOW}Esperando 30 segundos para o App Service iniciar...${NC}"
  sleep 30
  
  echo -e "${YELLOW}Verificando se o site está respondendo após reinício...${NC}"
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$APP_NAME.azurewebsites.net/ping 2>/dev/null || echo "Falha")
  if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}Site respondeu com status HTTP 200 OK após reinício${NC}"
  else
    echo -e "${RED}Site não respondeu corretamente após reinício. Status: $HTTP_STATUS${NC}"
  fi
else
  echo -e "${YELLOW}Operação de reinício cancelada.${NC}"
fi

echo -e "\n${GREEN}✓ Verificação concluída${NC}"
echo -e "${YELLOW}Acesse o site em:${NC} ${GREEN}https://$APP_NAME.azurewebsites.net${NC}"
echo -e "${YELLOW}Para mais detalhes, use o Kudu console:${NC} ${GREEN}https://$APP_NAME.scm.azurewebsites.net${NC}"