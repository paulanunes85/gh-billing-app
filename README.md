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