# GitHub Billing App

Aplicação para gerenciamento e monitoramento de custos do GitHub Copilot Enterprise para grandes organizações.

## Funcionalidades

- **Sincronização Automatizada**: Sincronize automaticamente dados de faturamento do GitHub Copilot via API oficial
- **Monitoramento de Custos**: Visualize custos por organização, usuário e período
- **Histórico de Faturamento**: Mantenha um registro de todas as cobranças e pagamentos
- **Dashboard Interativo**: Acompanhe estatísticas e tendências de uso
- **Relatórios Detalhados**: Gere relatórios personalizados por período e organização
- **Autenticação via GitHub**: Integração completa com GitHub OAuth

## Requisitos

- Node.js 14.x ou superior
- MongoDB 4.x ou superior
- Conta GitHub com acesso às organizações que deseja monitorar
- Acesso à API do GitHub Copilot Enterprise (requer permissões administrativas)

## Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/gh-billing-app.git
   cd gh-billing-app
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Copie o arquivo `.env.example` para `.env` e configure as variáveis:
   ```bash
   cp .env.example .env
   # Edite o arquivo .env com suas configurações
   ```

4. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

5. Para produção:
   ```bash
   npm start
   ```

## Implantação no Azure

### Pré-requisitos
- Uma assinatura ativa do Azure
- Azure CLI instalado ou acesso ao Portal Azure
- Um usuário ou grupo do Azure AD para administrar o Key Vault (você precisará do Object ID)
- Conta no GitHub com permissões para criar OAuth Apps
- Git instalado localmente

### Configurações Necessárias Antes da Implantação

#### 1. Configuração do GitHub OAuth App

1. Acesse o GitHub e vá para `Settings > Developer settings > OAuth Apps`
2. Clique em "New OAuth App"
3. Preencha as informações:
   - **Application name**: GitHub Billing App
   - **Homepage URL**: URL da sua aplicação (ou localhost para testes)
   - **Application description**: Opcional, mas recomendado
   - **Authorization callback URL**: `https://{seu-app-name}.azurewebsites.net/api/auth/github/callback`
4. Clique em "Register application"
5. Anote o "Client ID"
6. Clique em "Generate a new client secret" e anote o valor (você não poderá vê-lo novamente)

#### 2. Preparação do Azure AD

1. Obtenha o Object ID do usuário ou grupo que será administrador do Key Vault:
   ```bash
   # Para um usuário
   az ad user show --id usuario@dominio.com --query objectId -o tsv
   
   # Para um grupo
   az ad group show --group "Nome do Grupo" --query objectId -o tsv
   ```
2. Anote o Object ID para usar no template ARM

### Implantação Passo a Passo

1. **Preparar parâmetros de implantação**:
   Edite o arquivo `azuredeploy.parameters.json` e atualize os seguintes valores:
   
   ```json
   {
     "adminObjectId": {
       "value": "SEU-OBJECT-ID-DO-AZURE-AD"
     },
     "githubClientId": {
       "value": "SEU-GITHUB-CLIENT-ID"
     },
     "githubClientSecret": {
       "value": "SEU-GITHUB-CLIENT-SECRET"
     },
     "sessionSecret": {
       "value": "GERE-UMA-CHAVE-ALEATÓRIA-AQUI"
     }
   }
   ```

   Você pode gerar um session secret aleatório com:
   ```bash
   openssl rand -hex 32
   ```

2. **Criar o Resource Group (se não existir)**:
   ```bash
   az group create --name ghbilling-rg --location westus2
   ```

3. **Implantar a infraestrutura**:
   ```bash
   az deployment group create --resource-group ghbilling-rg --template-file azuredeploy.json --parameters azuredeploy.parameters.json
   ```

4. **Verificar a implantação**:
   ```bash
   # Obter URL da aplicação
   az webapp show --name <web-app-name> --resource-group ghbilling-rg --query defaultHostName -o tsv
   ```

### Configuração Pós-Implantação

Após a implantação dos recursos, você precisa concluir a configuração seguindo os scripts disponíveis na pasta `scripts/`:

1. **Tornar scripts executáveis**:
   ```bash
   chmod +x scripts/*.sh
   ```

2. **Configurar os segredos no Key Vault**:
   ```bash
   ./scripts/configure-secrets.sh
   ```

3. **Configurar o App Service para usar o Key Vault**:
   ```bash
   ./scripts/update-app-config.sh
   ```

4. **Implantar o código no App Service**:
   ```bash
   ./scripts/deploy.sh
   ```

5. **Opcional: Configurar domínio personalizado**:
   ```bash
   ./scripts/configure-custom-domain.sh
   ```

6. **Opcional: Configurar SSL para domínio personalizado**:
   ```bash
   ./scripts/setup-domain-ssl.sh
   ```

### Verificação da Instalação

1. Acesse a URL da aplicação (gerada na etapa de implantação)
2. Verifique se a página inicial carrega corretamente
3. Tente fazer login usando o GitHub OAuth
4. Confirme se você pode selecionar uma organização e acessar o dashboard

### Troubleshooting

1. **Problemas de Acesso ao Key Vault**:
   ```bash
   # Verificar atribuições RBAC
   az role assignment list --assignee <seu-object-id> --scope /subscriptions/<subscription-id>/resourceGroups/ghbilling-rg/providers/Microsoft.KeyVault/vaults/<key-vault-name>
   ```
   
   Se não houver atribuição, adicione:
   ```bash
   az role assignment create --assignee <seu-object-id> --role "Key Vault Administrator" --scope /subscriptions/<subscription-id>/resourceGroups/ghbilling-rg/providers/Microsoft.KeyVault/vaults/<key-vault-name>
   ```

2. **Problemas de Autenticação com GitHub**:
   - Verifique se o Client ID e Client Secret estão corretos no Key Vault
   - Confirme se a URL de callback está correta no GitHub OAuth App
   - Verifique se a URL de callback no Key Vault corresponde à configurada no GitHub

3. **Problemas no App Service**:
   - Verifique logs de aplicação:
     ```bash
     az webapp log tail --name <web-app-name> --resource-group ghbilling-rg
     ```
   - Confirmar configurações de aplicação:
     ```bash
     az webapp config appsettings list --name <web-app-name> --resource-group ghbilling-rg
     ```

### Monitoramento e Manutenção

1. **Monitoramento**:
   - Configure alertas no Application Insights
   - Monitore métricas do Cosmos DB
   - Verifique logs do App Service

2. **Backup e Recuperação**:
   - Confirme a execução dos backups do Cosmos DB
   - Teste o processo de restauração
   - Mantenha cópias das configurações

3. **Atualizações**:
   - Planeje janelas de manutenção
   - Teste em ambiente de desenvolvimento
   - Mantenha o template ARM atualizado

### Segurança e Boas Práticas

1. **Nunca armazene secrets no código**:
   - Use sempre o Azure Key Vault para armazenar segredos
   - Não inclua segredos em arquivos .env que vão para o controle de versão
   - Use referências para Key Vault ao invés de valores diretos

2. **Melhores Práticas de Segurança**:
   - Mantenha o TLS 1.2 ou superior
   - Use Private Link em produção
   - Implemente RBAC adequadamente
   - Monitore tentativas de acesso
   - Habilite auditoria no Key Vault
   - Mantenha logs por período adequado

3. **Compliance**:
   - Documente alterações de configuração
   - Mantenha um registro de controle de acesso
   - Revise permissões periodicamente

## GitHub Actions OIDC Credential

Para configurar a autenticação OIDC para o GitHub Actions, siga os passos abaixo:

1. **Nome da Credencial:** `GitHub_Actions_OIDC_Credential`
2. **Descrição:** `Federated credential for GitHub Actions to authenticate using OIDC for the gh-billing-app repository.`
3. **Issuer:** `https://token.actions.githubusercontent.com`
4. **Subject:** `repo:<your-github-username>/gh-billing-app:ref:refs/heads/main`
5. **Audience:** `api://AzureADTokenExchange`

Certifique-se de substituir `<your-github-username>` pelo seu nome de usuário do GitHub.

Para mais detalhes, consulte a [documentação oficial](https://learn.microsoft.com/entra/workload-id/workload-identity-federation).

## Uso

### Adicionando uma Organização

1. Faça login usando sua conta GitHub
2. Vá para a seção "Organizações" no menu
3. Clique em "Adicionar Organização"
4. Selecione a organização desejada e autorize o acesso
5. Configure as opções de sincronização

### Sincronizando Dados de Faturamento

1. Selecione uma organização no dashboard
2. Clique no botão "Sincronizar Faturamento"
3. Os dados do GitHub Copilot serão baixados e processados
4. Visualize estatísticas de uso e custos atualizados

### Geração de Relatórios

1. Acesse a seção "Relatórios" no menu
2. Selecione o período e as organizações desejadas
3. Clique em "Gerar Relatório"
4. Exporte para CSV ou PDF conforme necessário

## Contribuições

Contribuições são bem-vindas! Por favor, leia o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre nosso código de conduta e o processo para enviar pull requests.

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Suporte

Se você encontrar algum problema ou tiver sugestões, por favor abra uma issue no repositório.