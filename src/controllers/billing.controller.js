const BillingService = require('../services/billing.service');
const Billing = require('../models/billing.model');
const { validationResult } = require('express-validator');

/**
 * Controlador para operações relacionadas ao faturamento
 */
class BillingController {
  constructor() {
    this.billingService = new BillingService();
  }

  /**
   * Sincroniza os dados de faturamento do GitHub para uma organização
   */
  async syncBilling(req, res) {
    try {
      const { organizationId } = req.params;
      
      const billing = await this.billingService.syncBillingData(organizationId);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Dados de faturamento sincronizados com sucesso', 
        data: billing 
      });
    } catch (error) {
      console.error('Erro ao sincronizar dados de faturamento:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao sincronizar dados de faturamento', 
        error: error.message 
      });
    }
  }

  /**
   * Lista o histórico de faturamento de uma organização
   */
  async getBillingHistory(req, res) {
    try {
      const { organizationId } = req.params;
      
      const history = await this.billingService.getBillingHistory(organizationId);
      
      return res.status(200).json({ success: true, data: history });
    } catch (error) {
      console.error('Erro ao obter histórico de faturamento:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao obter histórico de faturamento', 
        error: error.message 
      });
    }
  }

  /**
   * Obtém detalhes de um registro de faturamento específico
   */
  async getBillingDetails(req, res) {
    try {
      const { billingId } = req.params;
      
      const billing = await Billing.findById(billingId).populate('organization', 'name login avatarUrl');
      
      if (!billing) {
        return res.status(404).json({ success: false, message: 'Registro de faturamento não encontrado' });
      }
      
      return res.status(200).json({ success: true, data: billing });
    } catch (error) {
      console.error('Erro ao obter detalhes do faturamento:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao obter detalhes do faturamento', 
        error: error.message 
      });
    }
  }

  /**
   * Atualiza o status de um registro de faturamento
   */
  async updateBillingStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const { billingId } = req.params;
      const { status } = req.body;
      
      // Verificar se o status é válido
      if (!['pending', 'paid', 'overdue'].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Status inválido. Utilize: pending, paid ou overdue.' 
        });
      }
      
      const updatedBilling = await this.billingService.updateBillingStatus(billingId, status);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Status de faturamento atualizado com sucesso', 
        data: {
          id: updatedBilling._id,
          status: updatedBilling.status,
          paidAt: updatedBilling.paidAt
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar status de faturamento:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao atualizar status de faturamento', 
        error: error.message 
      });
    }
  }

  /**
   * Gera um relatório de faturamento para o período especificado
   */
  async generateReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const report = await this.billingService.generateBillingReport(startDate, endDate);
      
      return res.status(200).json({ success: true, data: report });
    } catch (error) {
      console.error('Erro ao gerar relatório de faturamento:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao gerar relatório de faturamento', 
        error: error.message 
      });
    }
  }

  /**
   * Lista faturas pendentes por todas as organizações
   */
  async getPendingBillings(req, res) {
    try {
      const pendingBillings = await Billing.find({ status: 'pending' })
        .populate('organization', 'name login avatarUrl')
        .sort({ billingDate: 1 });
        
      return res.status(200).json({ success: true, data: pendingBillings });
    } catch (error) {
      console.error('Erro ao listar faturas pendentes:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao listar faturas pendentes', 
        error: error.message 
      });
    }
  }
}

module.exports = new BillingController();