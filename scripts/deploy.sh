#!/bin/bash

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"
ZIP_FILE="app.zip"

echo "Iniciando processo de deploy..."

# Etapa 1: Instalar dependências
echo "Instalando dependências..."
npm install --production

# Etapa 2: Criar arquivo de deploy
echo "Criando arquivo zip para deploy..."
zip -r $ZIP_FILE . -x "node_modules/*" "scripts/*" ".git/*" ".env" "*.zip"

# Etapa 3: Deploy para o App Service
echo "Fazendo deploy para o App Service..."
az webapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --src $ZIP_FILE

# Etapa 4: Reiniciar o App Service
echo "Reiniciando o App Service..."
az webapp restart --resource-group $RESOURCE_GROUP --name $APP_NAME

# Etapa 5: Limpar arquivo zip
echo "Limpando arquivos temporários..."
rm $ZIP_FILE

echo "Deploy concluído! Aguarde alguns minutos para que as alterações sejam aplicadas."
echo "Você pode verificar o status do deploy em: https://$APP_NAME.scm.azurewebsites.net/api/deployments"