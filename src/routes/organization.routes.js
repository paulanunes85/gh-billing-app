const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const organizationController = require('../controllers/organization.controller');

// Rota para listar todas as organizações
router.get('/', organizationController.listOrganizations);

// Rota para obter detalhes de uma organização específica
router.get('/:id', organizationController.getOrganization);

// Rota para adicionar uma nova organização
router.post('/', [
  check('login').notEmpty().withMessage('O login da organização é obrigatório'),
  check('accessToken').notEmpty().withMessage('O token de acesso é obrigatório'),
  check('githubId').notEmpty().withMessage('O ID da organização no GitHub é obrigatório')
], organizationController.addOrganization);

// Rota para atualizar o token de acesso de uma organização
router.patch('/:id/token', [
  check('accessToken').notEmpty().withMessage('O token de acesso é obrigatório')
], organizationController.updateToken);

// Rota para remover uma organização
router.delete('/:id', organizationController.removeOrganization);

// Rota para listar membros de uma organização
router.get('/:id/members', organizationController.listMembers);

module.exports = router;