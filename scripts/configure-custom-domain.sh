#!/bin/bash

# Configuração de domínio personalizado para o App Service
# Este script associa um domínio personalizado ao seu App Service no Azure

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"
CUSTOM_DOMAIN="seu-dominio.com" # Substitua pelo seu domínio real

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Configurando domínio personalizado para o App Service...${NC}"

# Verificar se o App Service existe
if ! az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo -e "${RED}Erro: App Service '$APP_NAME' não encontrado no grupo de recursos '$RESOURCE_GROUP'${NC}"
    exit 1
fi

# Solicitar o domínio, se não foi definido
if [ "$CUSTOM_DOMAIN" == "seu-dominio.com" ]; then
    echo -e "${YELLOW}Digite o domínio personalizado que deseja configurar:${NC}"
    read -r CUSTOM_DOMAIN
    
    # Verificar se o domínio foi informado
    if [ -z "$CUSTOM_DOMAIN" ]; then
        echo -e "${RED}Erro: Domínio não pode ser vazio.${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}Configurando o domínio '$CUSTOM_DOMAIN' para o App Service '$APP_NAME'...${NC}"

# 1. Verificar configuração DNS
echo -e "\n${YELLOW}Antes de continuar, certifique-se de que o registro CNAME do seu domínio está configurado corretamente.${NC}"
echo -e "${YELLOW}Você deve adicionar um registro CNAME para '$CUSTOM_DOMAIN' apontando para '${APP_NAME}.azurewebsites.net'${NC}"
echo -e "${YELLOW}Deseja continuar? [S/n]${NC} "
read -r RESPONSE
if [[ "$RESPONSE" =~ ^([nN]|[nN][aA][oO])$ ]]; then
    echo -e "${YELLOW}Operação cancelada pelo usuário.${NC}"
    exit 0
fi

# 2. Adicionar domínio personalizado
echo -e "\n${YELLOW}Adicionando domínio personalizado ao App Service...${NC}"
if az webapp config hostname add --webapp-name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --hostname "$CUSTOM_DOMAIN"; then
    echo -e "${GREEN}✓ Domínio personalizado '$CUSTOM_DOMAIN' adicionado com sucesso!${NC}"
else
    echo -e "${RED}✗ Erro ao adicionar domínio personalizado.${NC}"
    echo -e "${YELLOW}Verifique se o registro CNAME foi configurado corretamente e tente novamente.${NC}"
    exit 1
fi

# 3. Orientações para próximos passos
echo -e "\n${GREEN}===== Configuração de domínio concluída =====${NC}"
echo -e "${YELLOW}Próximos passos:${NC}"
echo -e "1. Para configurar SSL para seu domínio, execute o script setup-domain-ssl.sh"
echo -e "2. Atualize o CORS e as URLs de callback nas configurações do App Service"
echo -e "3. Atualize a configuração do OAuth App no GitHub com o novo callback URL"