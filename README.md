# GitHub Billing App

Uma aplicação para gerenciar e monitorar o faturamento do GitHub Copilot para organizações. O GitHub Billing App permite sincronizar dados de faturamento, monitorar custos por usuário, gerar relatórios e manter controle das despesas com GitHub Copilot Enterprise.

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

### Recursos Provisionados
O template ARM (`azuredeploy.json`) provisiona uma infraestrutura completa incluindo:

- **App Service Plan**: Hospeda a aplicação web
  - Suporte a Linux
  - Escala automática (em SKUs premium)
  - Várias opções de SKU (F1 a P3v2)

- **App Service**: 
  - Node.js runtime
  - HTTPS obrigatório
  - Configuração de CORS
  - Monitoramento de integridade
  - Auto-healing configurado

- **Cosmos DB (API MongoDB)**:
  - Backups automáticos configuráveis
  - Suporte a TLS 1.2
  - Restrições de rede configuráveis
  - MongoDB 4.0

- **Application Insights**:
  - Integração com Log Analytics
  - Monitoramento em tempo real
  - Rastreamento de requisições

- **Key Vault**:
  - Gerenciamento de segredos
  - RBAC habilitado
  - Soft delete ativado
  - Rede restrita configurável

### Parâmetros de Implantação

Principais parâmetros no `azuredeploy.parameters.json`:

| Parâmetro | Descrição | Exemplo |
|-----------|-----------|---------|
| environmentName | Ambiente (dev/test/qa/prod) | "dev" |
| projectName | Nome curto do projeto (3-11 chars) | "ghbill" |
| location | Região do Azure | "brazilsouth" |
| appServicePlanSku | SKU do App Service Plan | "F1" (dev) ou "P1v2" (prod) |
| adminObjectId | Object ID do admin do Key Vault | "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" |
| enablePrivateLink | Habilitar Azure Private Link | true/false |
| enableBackups | Habilitar backups do Cosmos DB | true/false |
| backupRetentionDays | Dias de retenção do backup | 7 |
| ipAddressRanges | IPs permitidos (CIDR) | ["10.0.0.0/24"] |

### Implantação Passo a Passo

1. **Preparação**:
   ```bash
   # Obter seu Object ID (necessário para o Key Vault)
   az ad signed-in-user show --query objectId -o tsv
   
   # Ou para um grupo:
   az ad group show --group AdminGroup --query objectId -o tsv
   ```

2. **Configurar Parâmetros**:
   - Copie `azuredeploy.parameters.json`
   - Preencha o `adminObjectId` com o ID obtido
   - Ajuste outros parâmetros conforme necessário

3. **Implantar**:
   ```bash
   # Criar grupo de recursos
   az group create --name MeuGrupoRecursos --location brazilsouth
   
   # Implantar template
   az deployment group create \
     --name GHBillingDeployment \
     --resource-group MeuGrupoRecursos \
     --template-file azuredeploy.json \
     --parameters azuredeploy.parameters.json
   ```

### Pós-Implantação

1. **Configurar Aplicação**:
   ```bash
   # Obter URL da aplicação
   az webapp show --name <web-app-name> --resource-group MeuGrupoRecursos --query defaultHostName

   # Configurar variáveis adicionais
   az webapp config appsettings set \
     --name <web-app-name> \
     --resource-group MeuGrupoRecursos \
     --settings \
     GITHUB_CLIENT_ID="seu-client-id" \
     GITHUB_CLIENT_SECRET="@Microsoft.KeyVault(SecretUri=https://<key-vault-name>.vault.azure.net/secrets/GitHubClientSecret/)" \
     NODE_ENV="production"
   ```

2. **Verificar Implantação**:
   - Acesse a URL da aplicação
   - Verifique logs no Application Insights
   - Teste a conexão com o Cosmos DB
   - Valide o acesso ao Key Vault

### Troubleshooting

1. **Problemas de Acesso ao Key Vault**:
   ```bash
   # Verificar atribuições RBAC
   az role assignment list --assignee <seu-object-id> --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.KeyVault/vaults/<key-vault-name>
   ```

2. **Problemas de Conexão com Cosmos DB**:
   - Verificar string de conexão no Key Vault
   - Confirmar regras de firewall
   - Validar configuração de rede

3. **Problemas no App Service**:
   - Verificar logs de diagnóstico
   - Validar configurações de aplicação
   - Confirmar versão do Node.js

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

### Segurança

1. **Melhores Práticas**:
   - Mantenha o TLS 1.2 ou superior
   - Use Private Link em produção
   - Implemente RBAC adequadamente
   - Monitore tentativas de acesso

2. **Compliance**:
   - Habilite auditoria no Key Vault
   - Mantenha logs por período adequado
   - Documente alterações de configuração

## Configuração

### Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

- `PORT`: Porta em que o servidor irá rodar (padrão: 3000)
- `MONGODB_URI`: URI para conexão com MongoDB
- `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET`: Credenciais OAuth do GitHub
- `SESSION_SECRET`: Chave secreta para sessões
- `JWT_SECRET`: Chave para geração de tokens JWT

### Configuração do GitHub OAuth

1. Vá para [GitHub Developer Settings](https://github.com/settings/developers)
2. Crie uma nova aplicação OAuth
3. Configure a URL de callback: `http://seu-dominio.com/api/auth/github/callback`
4. Obtenha o Client ID e Client Secret e adicione ao arquivo `.env`

## Estrutura do Projeto

```
gh-billing-app/
├── public/                # Arquivos estáticos
│   ├── css/              # Estilos CSS
│   ├── js/               # JavaScript do cliente
│   └── img/              # Imagens
├── src/
│   ├── controllers/      # Controladores da aplicação
│   ├── models/           # Modelos de dados (MongoDB/Mongoose)
│   ├── routes/           # Rotas da API e páginas
│   ├── services/         # Serviços para lógica de negócios
│   ├── utils/            # Utilitários
│   ├── views/            # Templates EJS
│   └── index.js          # Ponto de entrada da aplicação
├── .env.example          # Exemplo de variáveis de ambiente
├── package.json          # Dependências e scripts
└── README.md             # Documentação
```

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

## API Endpoints

A aplicação fornece uma API REST completa para integração com outros sistemas:

### Autenticação
- `POST /api/auth/login`: Login com email/senha
- `GET /api/auth/github`: Login com GitHub
- `POST /api/auth/logout`: Logout

### Organizações
- `GET /api/organizations`: Lista todas as organizações
- `GET /api/organizations/:id`: Detalhes de uma organização
- `POST /api/organizations`: Adiciona nova organização
- `PATCH /api/organizations/:id/token`: Atualiza token da organização

### Faturamento
- `POST /api/billing/sync/:organizationId`: Sincroniza dados de faturamento
- `GET /api/billing/organization/:organizationId`: Obtém histórico de faturamento
- `GET /api/billing/:billingId`: Obtém detalhes de um registro específico
- `PATCH /api/billing/:billingId/status`: Atualiza status de pagamento
- `GET /api/billing/reports/generate`: Gera relatório de faturamento

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para enviar pull requests ou abrir issues para sugerir melhorias ou relatar bugs.

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um pull request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.