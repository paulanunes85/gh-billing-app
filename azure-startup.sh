#!/bin/bash

# Este script é usado para inicializar a aplicação no Azure App Service

echo "Iniciando script de inicialização para o Azure App Service..."

# Navegar para o diretório da aplicação
cd /home/site/wwwroot

# Verificar se node_modules existe
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.install-completed" ]; then
  echo "Instalando dependências..."
  npm install --production
  touch node_modules/.install-completed
  echo "Dependências instaladas com sucesso!"
else
  echo "Dependências já instaladas, pulando instalação."
fi

# Verificar se express está instalado
if [ ! -d "node_modules/express" ]; then
  echo "Express não encontrado, reinstalando dependências..."
  rm -rf node_modules
  npm install --production
  touch node_modules/.install-completed
  echo "Dependências reinstaladas com sucesso!"
fi

# Iniciar a aplicação
echo "Iniciando a aplicação..."
node src/index.js