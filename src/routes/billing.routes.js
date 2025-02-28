const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const billingController = require('../controllers/billing.controller');

// Rota para sincronizar dados de faturamento de uma organização
router.post('/sync/:organizationId', billingController.syncBilling);

// Rota para obter histórico de faturamento de uma organização
router.get('/organization/:organizationId', billingController.getBillingHistory);

// Rota para obter detalhes específicos de um registro de faturamento
router.get('/:billingId', billingController.getBillingDetails);

// Rota para atualizar o status de faturamento
router.patch('/:billingId/status', [
  check('status').notEmpty().withMessage('O status é obrigatório')
], billingController.updateBillingStatus);

// Rota para gerar relatório de faturamento
router.get('/reports/generate', billingController.generateReport);

// Rota para listar faturas pendentes
router.get('/status/pending', billingController.getPendingBillings);

module.exports = router;