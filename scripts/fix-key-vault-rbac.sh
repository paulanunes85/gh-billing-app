#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variáveis
RESOURCE_GROUP="ghbilling-rg"
APP_NAME="ghbill-dev-app"
KEY_VAULT_NAME="ghbill-dev-kv"

echo -e "${YELLOW}Configurando acesso RBAC ao Key Vault para o App Service $APP_NAME...${NC}"

# 1. Verificar se a identidade gerenciada está ativada
echo -e "\n${YELLOW}Verificando se a identidade gerenciada está ativada...${NC}"
IDENTITY_STATUS=$(az webapp identity show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "principalId" --output tsv 2>/dev/null)

if [ -z "$IDENTITY_STATUS" ]; then
    echo -e "${RED}Identidade gerenciada não está ativada para o App Service. Ativando...${NC}"
    
    # Ativar a identidade gerenciada
    IDENTITY_RESULT=$(az webapp identity assign --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --output json)
    PRINCIPAL_ID=$(echo $IDENTITY_RESULT | jq -r '.principalId')
    
    if [ -z "$PRINCIPAL_ID" ] || [ "$PRINCIPAL_ID" == "null" ]; then
        echo -e "${RED}Falha ao ativar a identidade gerenciada. Verifique as permissões na assinatura do Azure.${NC}"
        exit 1
    else
        echo -e "${GREEN}Identidade gerenciada ativada com sucesso. ID: $PRINCIPAL_ID${NC}"
    fi
else
    echo -e "${GREEN}Identidade gerenciada já está ativada. ID: $IDENTITY_STATUS${NC}"
    PRINCIPAL_ID=$IDENTITY_STATUS
fi

# 2. Verificar se o Key Vault existe
echo -e "\n${YELLOW}Verificando se o Key Vault $KEY_VAULT_NAME existe...${NC}"
KEY_VAULT_ID=$(az keyvault show --name "$KEY_VAULT_NAME" --resource-group "$RESOURCE_GROUP" --query "id" --output tsv 2>/dev/null)

if [ -z "$KEY_VAULT_ID" ]; then
    echo -e "${RED}Key Vault $KEY_VAULT_NAME não encontrado no grupo de recursos $RESOURCE_GROUP.${NC}"
    exit 1
else
    echo -e "${GREEN}Key Vault encontrado: $KEY_VAULT_ID${NC}"
fi

# 3. Conceder permissões RBAC para acessar o Key Vault
echo -e "\n${YELLOW}Concedendo permissões RBAC para o App Service acessar o Key Vault...${NC}"
echo -e "${YELLOW}Atribuindo a role 'Key Vault Secrets User' para a identidade gerenciada...${NC}"

# Verificar se a role já está atribuída
ROLE_ASSIGNMENT=$(az role assignment list --assignee "$PRINCIPAL_ID" --scope "$KEY_VAULT_ID" --query "[?roleDefinitionName=='Key Vault Secrets User'].id" --output tsv)

if [ -z "$ROLE_ASSIGNMENT" ]; then
    # Atribuir a role
    az role assignment create \
        --assignee-object-id "$PRINCIPAL_ID" \
        --assignee-principal-type ServicePrincipal \
        --role "Key Vault Secrets User" \
        --scope "$KEY_VAULT_ID"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Role 'Key Vault Secrets User' atribuída com sucesso.${NC}"
    else
        echo -e "${RED}Erro ao atribuir a role. Você tem permissões para gerenciar roles?${NC}"
        echo -e "${YELLOW}Tentando com a role Reader alternativa...${NC}"
        
        az role assignment create \
            --assignee-object-id "$PRINCIPAL_ID" \
            --assignee-principal-type ServicePrincipal \
            --role "Reader" \
            --scope "$KEY_VAULT_ID"
        
        if [ $? -eq 0 ]; then
            echo -e "${YELLOW}Role 'Reader' atribuída com sucesso (funcionalidade limitada).${NC}"
        else
            echo -e "${RED}Erro ao atribuir roles. Verifique suas permissões ou atribua as roles manualmente no portal do Azure.${NC}"
        fi
    fi
else
    echo -e "${GREEN}A role já está atribuída para a identidade gerenciada.${NC}"
fi

# 4. Adicionar também a role específica para secrets se não for a padrão
echo -e "\n${YELLOW}Verificando se o App Service tem a role específica para secrets...${NC}"

ROLE_ASSIGNMENT_SECRET=$(az role assignment list --assignee "$PRINCIPAL_ID" --scope "$KEY_VAULT_ID/secrets" --query "[?roleDefinitionName=='Key Vault Secrets User'].id" --output tsv)

if [ -z "$ROLE_ASSIGNMENT_SECRET" ]; then
    # Atribuir a role específica para secrets
    az role assignment create \
        --assignee-object-id "$PRINCIPAL_ID" \
        --assignee-principal-type ServicePrincipal \
        --role "Key Vault Secrets User" \
        --scope "$KEY_VAULT_ID/secrets"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Role 'Key Vault Secrets User' para secrets atribuída com sucesso.${NC}"
    else
        echo -e "${RED}Erro ao atribuir a role para secrets.${NC}"
    fi
else
    echo -e "${GREEN}A role para secrets já está atribuída.${NC}"
fi

# 5. Atualizar as configurações do App Service
echo -e "\n${YELLOW}Atualizando configurações de variáveis de ambiente do App Service...${NC}"
az webapp config appsettings set --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
    --settings \
    "AZURE_KEY_VAULT_NAME=$KEY_VAULT_NAME" \
    "MONGODB_URI=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/MongoDbUri/)" \
    "SESSION_SECRET=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/SessionSecret/)" \
    "GITHUB_CLIENT_ID=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/GitHubClientId/)" \
    "GITHUB_CLIENT_SECRET=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/GitHubClientSecret/)" \
    "GITHUB_CALLBACK_URL=@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/GitHubCallbackUrl/)" \
    "WEBSITES_PORT=8080" \
    "PORT=8080"

echo -e "${GREEN}✅ Configurações do App Service atualizadas com sucesso.${NC}"

# 6. Configurar fallback para caso o Key Vault não esteja acessível
echo -e "\n${YELLOW}Deseja configurar valores de fallback diretamente no App Service? (s/n)${NC}"
read -r FALLBACK_RESP

if [[ "$FALLBACK_RESP" =~ ^([sS][iI]|[sS])$ ]]; then
    echo -e "${YELLOW}Digite a string de conexão MongoDB (pressione Enter para pular):${NC}"
    read -r MONGO_URI
    
    echo -e "${YELLOW}Digite o secret de sessão (pressione Enter para pular):${NC}"
    read -r SESSION_SECRET
    
    echo -e "${YELLOW}Digite o GitHub Client ID (pressione Enter para pular):${NC}"
    read -r GITHUB_CLIENT_ID
    
    echo -e "${YELLOW}Digite o GitHub Client Secret (pressione Enter para pular):${NC}"
    read -r GITHUB_CLIENT_SECRET
    
    echo -e "${YELLOW}Digite o GitHub Callback URL (pressione Enter para pular):${NC}"
    read -r GITHUB_CALLBACK_URL
    
    # Configurações para adicionar (apenas valores não vazios)
    SETTINGS_ARRAY=()
    
    if [ ! -z "$MONGO_URI" ]; then
        SETTINGS_ARRAY+=("MONGODB_URI_FALLBACK=$MONGO_URI")
    fi
    
    if [ ! -z "$SESSION_SECRET" ]; then
        SETTINGS_ARRAY+=("SESSION_SECRET_FALLBACK=$SESSION_SECRET")
    fi
    
    if [ ! -z "$GITHUB_CLIENT_ID" ]; then
        SETTINGS_ARRAY+=("GITHUB_CLIENT_ID_FALLBACK=$GITHUB_CLIENT_ID")
    fi
    
    if [ ! -z "$GITHUB_CLIENT_SECRET" ]; then
        SETTINGS_ARRAY+=("GITHUB_CLIENT_SECRET_FALLBACK=$GITHUB_CLIENT_SECRET")
    fi
    
    if [ ! -z "$GITHUB_CALLBACK_URL" ]; then
        SETTINGS_ARRAY+=("GITHUB_CALLBACK_URL_FALLBACK=$GITHUB_CALLBACK_URL")
    fi
    
    # Se houver configurações para adicionar
    if [ ${#SETTINGS_ARRAY[@]} -gt 0 ]; then
        echo -e "${YELLOW}Adicionando valores de fallback...${NC}"
        az webapp config appsettings set --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
            --settings "${SETTINGS_ARRAY[@]}"
        echo -e "${GREEN}✅ Valores de fallback configurados com sucesso.${NC}"
    else
        echo -e "${YELLOW}Nenhum valor de fallback fornecido.${NC}"
    fi
else
    echo -e "${YELLOW}Nenhum valor de fallback será configurado.${NC}"
fi

# 7. Reinicie o App Service para aplicar as alterações
echo -e "\n${YELLOW}Reiniciando o App Service...${NC}"
az webapp restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP"

echo -e "\n${GREEN}✓ Configuração concluída${NC}"
echo -e "${YELLOW}O App Service foi configurado para acessar o Key Vault usando RBAC.${NC}"
echo -e "${YELLOW}Verifique se o App Service está funcionando corretamente em:${NC} ${GREEN}https://$APP_NAME.azurewebsites.net${NC}"