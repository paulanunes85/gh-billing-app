#!/bin/bash

# Configuração de SSL para domínio personalizado no App Service
# Este script configura um certificado SSL gerenciado pelo Azure para seu domínio personalizado

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"
CUSTOM_DOMAIN="" # Será solicitado durante a execução

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Configurando SSL para domínio personalizado no App Service...${NC}"

# Verificar se o App Service existe
if ! az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo -e "${RED}Erro: App Service '$APP_NAME' não encontrado no grupo de recursos '$RESOURCE_GROUP'${NC}"
    exit 1
fi

# Listar domínios personalizados associados ao App Service
echo -e "${YELLOW}Domínios personalizados associados ao App Service:${NC}"
DOMAINS=$(az webapp config hostname list --webapp-name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "[].name" -o tsv)

if [ -z "$DOMAINS" ]; then
    echo -e "${RED}Erro: Nenhum domínio personalizado encontrado.${NC}"
    echo -e "${YELLOW}Execute primeiro o script configure-custom-domain.sh para associar um domínio personalizado.${NC}"
    exit 1
fi

echo "$DOMAINS"

# Solicitar o domínio para configuração de SSL
echo -e "\n${YELLOW}Digite o domínio para o qual deseja configurar o SSL:${NC}"
read -r CUSTOM_DOMAIN

# Verificar se o domínio informado está na lista de domínios associados
if ! echo "$DOMAINS" | grep -q "$CUSTOM_DOMAIN"; then
    echo -e "${RED}Erro: O domínio '$CUSTOM_DOMAIN' não está associado ao App Service.${NC}"
    echo -e "${YELLOW}Execute primeiro o script configure-custom-domain.sh para associar este domínio.${NC}"
    exit 1
fi

# Configurar certificado gerenciado pela App Service
echo -e "\n${YELLOW}Configurando certificado SSL gerenciado pelo Azure para '$CUSTOM_DOMAIN'...${NC}"
if az webapp config ssl create --hostname "$CUSTOM_DOMAIN" --resource-group "$RESOURCE_GROUP" --name "$APP_NAME"; then
    echo -e "${GREEN}✓ Certificado SSL solicitado com sucesso!${NC}"
else
    echo -e "${RED}✗ Erro ao solicitar certificado SSL.${NC}"
    echo -e "${YELLOW}Verifique se o domínio está configurado corretamente e tente novamente.${NC}"
    exit 1
fi

# Ligar o certificado ao domínio
echo -e "\n${YELLOW}Associando certificado SSL ao domínio personalizado...${NC}"
THUMBPRINT=$(az webapp config ssl list --resource-group "$RESOURCE_GROUP" --query "[?name=='$CUSTOM_DOMAIN'].thumbprint" -o tsv)

if [ -z "$THUMBPRINT" ]; then
    echo -e "${RED}✗ Erro: Não foi possível obter o thumbprint do certificado.${NC}"
    echo -e "${YELLOW}O certificado pode estar ainda em processo de emissão. Tente novamente mais tarde.${NC}"
    exit 1
fi

if az webapp config ssl bind --certificate-thumbprint "$THUMBPRINT" --ssl-type SNI --name "$APP_NAME" --resource-group "$RESOURCE_GROUP"; then
    echo -e "${GREEN}✓ Certificado SSL associado com sucesso!${NC}"
else
    echo -e "${RED}✗ Erro ao associar certificado SSL.${NC}"
    exit 1
fi

# Forçar HTTPS para o App Service
echo -e "\n${YELLOW}Configurando redirecionamento HTTPS para o App Service...${NC}"
if az webapp update --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --https-only true; then
    echo -e "${GREEN}✓ Redirecionamento HTTPS configurado com sucesso!${NC}"
else
    echo -e "${RED}✗ Erro ao configurar redirecionamento HTTPS.${NC}"
    exit 1
fi

# Orientações para próximos passos
echo -e "\n${GREEN}===== Configuração de SSL concluída =====${NC}"
echo -e "${YELLOW}Próximos passos:${NC}"
echo -e "1. Atualize as URLs de callback nas configurações do OAuth App no GitHub para usar HTTPS"
echo -e "2. Atualize a variável GitHubCallbackUrl no Key Vault para usar HTTPS"
echo -e "3. Reinicie o App Service para aplicar todas as alterações"

echo -e "\n${YELLOW}O certificado SSL gerenciado pelo Azure será renovado automaticamente antes da expiração.${NC}"