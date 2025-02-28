const GitHubService = require('./github.service');
const Billing = require('../models/billing.model');
const Organization = require('../models/organization.model');
const moment = require('moment');

class BillingService {
  constructor() {}

  /**
   * Sincroniza dados de faturamento do GitHub Copilot para uma organização específica
   * @param {String} orgId - ID da organização no banco de dados
   * @returns {Object} - Informações de faturamento atualizadas
   */
  async syncBillingData(orgId) {
    try {
      const organization = await Organization.findById(orgId);
      if (!organization) {
        throw new Error('Organização não encontrada');
      }

      const githubService = new GitHubService(organization.accessToken);
      
      // Busca os dados de faturamento do Copilot
      const billingData = await githubService.getCopilotBilling(organization.login);
      
      // Busca detalhes dos assentos para análise detalhada
      const seatDetails = await githubService.getCopilotSeatDetails(organization.login);
      
      // Informações do mês atual
      const currentMonth = moment().format('MMMM');
      const currentYear = moment().year();
      const periodStart = moment().startOf('month');
      const periodEnd = moment().endOf('month');
      
      // Verifica se já existe registro para este mês/ano
      let billing = await Billing.findOne({
        organization: orgId,
        month: currentMonth,
        year: currentYear
      });
      
      // Processa os detalhes de uso por usuário
      const usageBreakdown = await this._processUserUsage(githubService, organization.login, seatDetails);
      
      // Calcula o total de acordo com os dados recebidos
      const totalAmount = billingData.estimated_total_amount || billingData.total_amount || 0;
      
      if (!billing) {
        // Cria um novo registro se não existir
        billing = new Billing({
          organization: orgId,
          businessUnit: organization.businessUnit,
          costCenter: organization.costCenter,
          month: currentMonth,
          year: currentYear,
          totalAmount,
          currency: billingData.currency || 'USD',
          usageBreakdown,
          billingPeriodStart: periodStart.toDate(),
          billingPeriodEnd: periodEnd.toDate(),
          billingDate: periodEnd.toDate(),
          status: 'pending'
        });
      } else {
        // Atualiza registro existente
        billing.businessUnit = organization.businessUnit;
        billing.costCenter = organization.costCenter;
        billing.totalAmount = totalAmount;
        billing.currency = billingData.currency || billing.currency;
        billing.usageBreakdown = usageBreakdown;
        billing.updatedAt = Date.now();
      }
      
      await billing.save();
      return billing;
    } catch (error) {
      console.error('Erro ao sincronizar dados de faturamento:', error);
      throw error;
    }
  }

  /**
   * Processa os detalhes de uso para cada usuário com acesso ao Copilot
   * @private
   */
  async _processUserUsage(githubService, orgName, seatDetails) {
    try {
      const usageBreakdown = [];
      
      // Se seatDetails contém informações de usuários, processe cada um
      if (seatDetails && Array.isArray(seatDetails.seats)) {
        for (const seat of seatDetails.seats) {
          try {
            // Tenta obter informações de uso para o usuário
            const userUsage = await githubService.getUserCopilotUsage(orgName, seat.assignee.login);
            
            usageBreakdown.push({
              username: seat.assignee.login,
              userId: seat.assignee.id.toString(),
              usageMinutes: userUsage ? userUsage.total_minutes || 0 : 0,
              cost: userUsage ? userUsage.estimated_cost || 10 : 10 // valor padrão ou estimado
            });
          } catch (error) {
            // Se não conseguir obter dados específicos, adiciona informações básicas
            usageBreakdown.push({
              username: seat.assignee.login,
              userId: seat.assignee.id.toString(),
              usageMinutes: 0,
              cost: 10 // valor padrão
            });
          }
        }
      }
      
      return usageBreakdown;
    } catch (error) {
      console.error('Erro ao processar detalhes de uso:', error);
      return [];
    }
  }

  /**
   * Atualiza o status de pagamento de uma fatura
   */
  async updateBillingStatus(billingId, status) {
    try {
      const billing = await Billing.findById(billingId);
      if (!billing) {
        throw new Error('Fatura não encontrada');
      }
      
      billing.status = status;
      
      if (status === 'paid') {
        billing.paidAt = Date.now();
      }
      
      billing.updatedAt = Date.now();
      await billing.save();
      
      return billing;
    } catch (error) {
      console.error('Erro ao atualizar status da fatura:', error);
      throw error;
    }
  }

  /**
   * Obtém o histórico de faturamento para uma organização
   */
  async getBillingHistory(orgId) {
    try {
      const billingHistory = await Billing.find({ organization: orgId })
        .sort({ year: -1, month: -1 })
        .populate('organization', 'name login');
      
      return billingHistory;
    } catch (error) {
      console.error('Erro ao obter histórico de faturamento:', error);
      throw error;
    }
  }

  /**
   * Gera relatórios de faturamento consolidados para todas as organizações
   */
  async generateBillingReport(startDate, endDate, businessUnit = null) {
    try {
      const query = {};
      
      if (startDate && endDate) {
        query.billingPeriodStart = { $gte: new Date(startDate) };
        query.billingPeriodEnd = { $lte: new Date(endDate) };
      }

      if (businessUnit) {
        query.businessUnit = businessUnit;
      }
      
      const billings = await Billing.find(query)
        .populate('organization', 'name login businessUnit costCenter');
      
      const report = {
        totalBilled: 0,
        totalPaid: 0,
        totalPending: 0,
        businessUnitSummary: {},
        organizationSummary: {},
        billingPeriods: {}
      };
      
      billings.forEach(billing => {
        const orgName = billing.organization.name;
        const businessUnit = billing.businessUnit;
        const period = `${billing.month} ${billing.year}`;
        
        // Totais gerais
        report.totalBilled += billing.totalAmount;
        if (billing.status === 'paid') {
          report.totalPaid += billing.totalAmount;
        } else {
          report.totalPending += billing.totalAmount;
        }
        
        // Resumo por Business Unit
        if (!report.businessUnitSummary[businessUnit]) {
          report.businessUnitSummary[businessUnit] = {
            totalAmount: 0,
            organizations: new Set(),
            costBreakdown: []
          };
        }
        report.businessUnitSummary[businessUnit].totalAmount += billing.totalAmount;
        report.businessUnitSummary[businessUnit].organizations.add(orgName);
        report.businessUnitSummary[businessUnit].costBreakdown.push({
          period,
          organization: orgName,
          amount: billing.totalAmount,
          status: billing.status
        });
        
        // Resumo por organização
        if (!report.organizationSummary[orgName]) {
          report.organizationSummary[orgName] = {
            totalAmount: 0,
            businessUnit,
            costCenter: billing.costCenter,
            periods: []
          };
        }
        report.organizationSummary[orgName].totalAmount += billing.totalAmount;
        report.organizationSummary[orgName].periods.push({
          period,
          amount: billing.totalAmount,
          status: billing.status,
          usageDetails: billing.usageBreakdown
        });
        
        // Resumo por período
        if (!report.billingPeriods[period]) {
          report.billingPeriods[period] = {
            totalAmount: 0,
            byBusinessUnit: {}
          };
        }
        report.billingPeriods[period].totalAmount += billing.totalAmount;
        
        if (!report.billingPeriods[period].byBusinessUnit[businessUnit]) {
          report.billingPeriods[period].byBusinessUnit[businessUnit] = {
            amount: 0,
            organizations: []
          };
        }
        report.billingPeriods[period].byBusinessUnit[businessUnit].amount += billing.totalAmount;
        report.billingPeriods[period].byBusinessUnit[businessUnit].organizations.push({
          name: orgName,
          amount: billing.totalAmount,
          status: billing.status
        });
      });

      // Converte Sets para Arrays no resumo de business units
      Object.keys(report.businessUnitSummary).forEach(bu => {
        report.businessUnitSummary[bu].organizations = 
          Array.from(report.businessUnitSummary[bu].organizations);
      });
      
      return report;
    } catch (error) {
      console.error('Erro ao gerar relatório de faturamento:', error);
      throw error;
    }
  }

  async getBusinessUnitsSummary() {
    try {
      const summary = await Billing.aggregate([
        {
          $group: {
            _id: '$businessUnit',
            totalAmount: { $sum: '$totalAmount' },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0]
              }
            },
            pendingAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, '$totalAmount', 0]
              }
            },
            organizationCount: { $addToSet: '$organization' }
          }
        },
        {
          $project: {
            businessUnit: '$_id',
            totalAmount: 1,
            paidAmount: 1,
            pendingAmount: 1,
            organizationCount: { $size: '$organizationCount' }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]);

      return summary;
    } catch (error) {
      console.error('Erro ao gerar resumo por business unit:', error);
      throw error;
    }
  }
}

module.exports = BillingService;