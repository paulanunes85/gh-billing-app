#!/bin/bash

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
KEY_VAULT_NAME="ghbill-dev-kv"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando configuração de segredos no Azure Key Vault...${NC}"

# Verificar se o Key Vault existe
if ! az keyvault show --name "$KEY_VAULT_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo -e "${RED}Erro: Key Vault '$KEY_VAULT_NAME' não encontrado no grupo de recursos '$RESOURCE_GROUP'${NC}"
    exit 1
fi

# Função para adicionar/atualizar segredo
add_secret() {
    local SECRET_NAME=$1
    local SECRET_DESCRIPTION=$2
    local DEFAULT_VALUE=$3
    
    # Verificar se o segredo já existe
    if az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$SECRET_NAME" &>/dev/null; then
        echo -e "${YELLOW}O segredo '$SECRET_NAME' já existe. Deseja sobrescrevê-lo? [s/N]${NC} "
        read -r RESPONSE
        if [[ ! "$RESPONSE" =~ ^([sS]|[sS][iI][mM])$ ]]; then
            echo -e "${YELLOW}Mantendo o valor atual para '$SECRET_NAME'${NC}"
            return
        fi
    fi
    
    # Solicitar valor do segredo (ou usar valor padrão se fornecido)
    if [ -n "$DEFAULT_VALUE" ]; then
        echo -e "${YELLOW}Informe $SECRET_DESCRIPTION (pressione ENTER para usar o padrão):${NC} "
    else
        echo -e "${YELLOW}Informe $SECRET_DESCRIPTION:${NC} "
    fi
    
    read -r -s SECRET_VALUE
    echo
    
    # Usar valor padrão se nenhum valor for fornecido
    if [ -z "$SECRET_VALUE" ] && [ -n "$DEFAULT_VALUE" ]; then
        SECRET_VALUE="$DEFAULT_VALUE"
    fi
    
    # Validar entrada
    if [ -z "$SECRET_VALUE" ]; then
        echo -e "${RED}Erro: Valor não pode ser vazio.${NC}"
        return 1
    fi
    
    # Adicionar o segredo ao Key Vault
    if az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "$SECRET_NAME" --value "$SECRET_VALUE" &>/dev/null; then
        echo -e "${GREEN}✓ Segredo '$SECRET_NAME' configurado com sucesso${NC}"
    else
        echo -e "${RED}✗ Erro ao configurar o segredo '$SECRET_NAME'${NC}"
        return 1
    fi
}

# Configurar segredos
echo -e "\n${YELLOW}===== Configurando segredos para GitHub OAuth =====${NC}"
add_secret "GitHubClientId" "o ID do cliente OAuth do GitHub" ""
add_secret "GitHubClientSecret" "o segredo do cliente OAuth do GitHub" ""

echo -e "\n${YELLOW}===== Configurando segredos para Sessão =====${NC}"
# Gerar um segredo aleatório para a sessão
SESSION_SECRET=$(openssl rand -hex 32)
add_secret "SessionSecret" "o segredo para encriptação de sessões" "$SESSION_SECRET"

echo -e "\n${YELLOW}===== Verificando segredos existentes =====${NC}"
# Verificar se o segredo do MongoDB já existe
if az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "MongoDbUri" &>/dev/null; then
    echo -e "${GREEN}✓ Segredo 'MongoDbUri' já existe${NC}"
else
    echo -e "${YELLOW}O segredo 'MongoDbUri' não existe. Deseja configurá-lo manualmente? [S/n]${NC} "
    read -r RESPONSE
    if [[ ! "$RESPONSE" =~ ^([nN]|[nN][aA][oO])$ ]]; then
        add_secret "MongoDbUri" "a URI de conexão do MongoDB" ""
    fi
fi

# Configurar uma chave de API para consumo de dados do GitHub Copilot
echo -e "\n${YELLOW}===== Configurando chave de API para GitHub Copilot =====${NC}"
add_secret "GitHubCopilotApiKey" "a chave de API para GitHub Copilot" ""

echo -e "\n${GREEN}===== Configuração de segredos concluída =====${NC}"
echo -e "${YELLOW}Próximos passos:${NC}"
echo -e "1. Configure o callback URL do GitHub OAuth para: https://ghbill-dev-app.azurewebsites.net/api/auth/github/callback"
echo -e "2. Atualize as configurações do App Service para usar os segredos do Key Vault"
echo -e "3. Reinicie o App Service para aplicar as alterações"