#!/bin/bash

# Variáveis
APP_NAME="ghbill-dev-app"
APP_URL="https://${APP_NAME}.azurewebsites.net"

echo "Verificando status do App Service ${APP_NAME}..."

# Testar endpoints principais
echo -e "\n--- Testando endpoint principal ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}")
echo "Status do endpoint principal: ${HTTP_CODE}"

echo -e "\n--- Testando endpoint /ping ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}/ping")
echo "Status do endpoint /ping: ${HTTP_CODE}"

echo -e "\n--- Testando endpoint /health ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}/health")
echo "Status do endpoint /health: ${HTTP_CODE}"

echo -e "\n--- Respostas detalhadas ---"
echo "Resposta do endpoint principal:"
curl -s "${APP_URL}" | head -n 20

echo -e "\n\nResposta do endpoint /ping:"
curl -s "${APP_URL}/ping"

echo -e "\n\nResposta do endpoint /health:"
curl -s "${APP_URL}/health"

echo -e "\n\n--- Verificação de registros de erro no App Service ---"
echo "Para verificar logs detalhados, execute:"
echo "az webapp log tail --name ${APP_NAME} --resource-group ghbilling-rg"