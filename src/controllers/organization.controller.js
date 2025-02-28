const Organization = require('../models/organization.model');
const Billing = require('../models/billing.model');
const GitHubService = require('../services/github.service');
const { validationResult } = require('express-validator');

/**
 * Controlador para operações relacionadas às organizações
 */
class OrganizationController {
  /**
   * Lista todas as organizações cadastradas
   */
  async listOrganizations(req, res) {
    try {
      const organizations = await Organization.find().select('-accessToken -refreshToken');
      return res.status(200).json({ success: true, data: organizations });
    } catch (error) {
      console.error('Erro ao listar organizações:', error);
      return res.status(500).json({ success: false, message: 'Erro ao listar organizações', error: error.message });
    }
  }

  /**
   * Obtém detalhes de uma organização específica
   */
  async getOrganization(req, res) {
    try {
      const { id } = req.params;
      const organization = await Organization.findById(id).select('-accessToken -refreshToken');
      
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organização não encontrada' });
      }
      
      return res.status(200).json({ success: true, data: organization });
    } catch (error) {
      console.error('Erro ao obter detalhes da organização:', error);
      return res.status(500).json({ success: false, message: 'Erro ao obter detalhes da organização', error: error.message });
    }
  }

  /**
   * Adiciona uma nova organização com base nos dados do GitHub
   */
  async addOrganization(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const { githubId, accessToken } = req.body;
      
      // Verifica se a organização já existe
      let organization = await Organization.findOne({ githubId });
      if (organization) {
        return res.status(400).json({ success: false, message: 'Organização já cadastrada' });
      }
      
      // Obtém detalhes da organização do GitHub
      const githubService = new GitHubService(accessToken);
      const orgDetails = await githubService.getOrganizationDetails(req.body.login);
      
      // Cria nova organização
      organization = new Organization({
        name: orgDetails.name || orgDetails.login,
        githubId: orgDetails.id.toString(),
        login: orgDetails.login,
        avatarUrl: orgDetails.avatar_url,
        accessToken,
        refreshToken: req.body.refreshToken || null,
        tokenExpiresAt: req.body.tokenExpiresAt ? new Date(req.body.tokenExpiresAt) : null,
        businessUnit: req.body.businessUnit || 'Default'
      });
      
      await organization.save();
      
      return res.status(201).json({ 
        success: true, 
        message: 'Organização adicionada com sucesso', 
        data: { 
          id: organization._id, 
          name: organization.name,
          login: organization.login,
          businessUnit: organization.businessUnit
        }
      });
    } catch (error) {
      console.error('Erro ao adicionar organização:', error);
      return res.status(500).json({ success: false, message: 'Erro ao adicionar organização', error: error.message });
    }
  }

  /**
   * Atualiza as informações gerais de uma organização
   */
  async updateOrganization(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const { id } = req.params;
      const { name, businessUnit, costCenter, description } = req.body;
      
      const organization = await Organization.findById(id);
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organização não encontrada' });
      }
      
      // Atualizar apenas os campos fornecidos
      if (name) organization.name = name;
      if (businessUnit) organization.businessUnit = businessUnit;
      if (costCenter !== undefined) organization.costCenter = costCenter;
      if (description !== undefined) organization.description = description;
      
      organization.updatedAt = Date.now();
      
      await organization.save();
      
      return res.status(200).json({ 
        success: true, 
        message: 'Organização atualizada com sucesso',
        data: {
          id: organization._id,
          name: organization.name,
          businessUnit: organization.businessUnit,
          costCenter: organization.costCenter,
          description: organization.description
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar organização:', error);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar organização', error: error.message });
    }
  }

  /**
   * Atualiza o token de acesso de uma organização
   */
  async updateToken(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const { id } = req.params;
      const { accessToken, refreshToken, tokenExpiresAt } = req.body;
      
      const organization = await Organization.findById(id);
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organização não encontrada' });
      }
      
      organization.accessToken = accessToken;
      if (refreshToken) organization.refreshToken = refreshToken;
      if (tokenExpiresAt) organization.tokenExpiresAt = new Date(tokenExpiresAt);
      organization.updatedAt = Date.now();
      
      await organization.save();
      
      return res.status(200).json({ success: true, message: 'Token atualizado com sucesso' });
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar token', error: error.message });
    }
  }

  /**
   * Remove uma organização do sistema
   */
  async removeOrganization(req, res) {
    try {
      const { id } = req.params;
      
      const result = await Organization.findByIdAndDelete(id);
      if (!result) {
        return res.status(404).json({ success: false, message: 'Organização não encontrada' });
      }
      
      return res.status(200).json({ success: true, message: 'Organização removida com sucesso' });
    } catch (error) {
      console.error('Erro ao remover organização:', error);
      return res.status(500).json({ success: false, message: 'Erro ao remover organização', error: error.message });
    }
  }

  /**
   * Lista os membros de uma organização no GitHub
   */
  async listMembers(req, res) {
    try {
      const { id } = req.params;
      
      const organization = await Organization.findById(id);
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organização não encontrada' });
      }
      
      const githubService = new GitHubService(organization.accessToken);
      const members = await githubService.getOrganizationMembers(organization.login);
      
      return res.status(200).json({ success: true, data: members });
    } catch (error) {
      console.error('Erro ao listar membros da organização:', error);
      return res.status(500).json({ success: false, message: 'Erro ao listar membros da organização', error: error.message });
    }
  }

  /**
   * Lista todas as organizações agrupadas por business unit
   */
  async listByBusinessUnit(req, res) {
    try {
      const organizations = await Organization.aggregate([
        {
          $group: {
            _id: '$businessUnit',
            organizations: { $push: '$$ROOT' },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            businessUnit: '$_id',
            organizations: {
              $map: {
                input: '$organizations',
                as: 'org',
                in: {
                  _id: '$$org._id',
                  name: '$$org.name',
                  login: '$$org.login',
                  avatarUrl: '$$org.avatarUrl',
                  costCenter: '$$org.costCenter',
                  description: '$$org.description'
                }
              }
            },
            count: 1
          }
        },
        { $sort: { businessUnit: 1 } }
      ]);

      return res.status(200).json({ success: true, data: organizations });
    } catch (error) {
      console.error('Erro ao listar organizações por business unit:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao listar organizações por business unit', 
        error: error.message 
      });
    }
  }

  /**
   * Obtém estatísticas detalhadas de uma business unit específica
   */
  async getBusinessUnitStats(req, res) {
    try {
      const { businessUnit } = req.params;
      
      // Busca organizações da business unit
      const organizations = await Organization.find({ businessUnit });
      
      if (organizations.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Business unit não encontrada ou sem organizações' 
        });
      }

      const orgIds = organizations.map(org => org._id);

      // Agrega dados de faturamento
      const billingStats = await Billing.aggregate([
        {
          $match: {
            organization: { $in: orgIds }
          }
        },
        {
          $group: {
            _id: {
              month: '$month',
              year: '$year'
            },
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
            _id: 1,
            totalAmount: 1,
            paidAmount: 1,
            pendingAmount: 1,
            organizationCount: { $size: '$organizationCount' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } }
      ]);

      // Calcula estatísticas gerais
      const totalStats = billingStats.reduce((acc, curr) => {
        acc.totalAmount += curr.totalAmount;
        acc.paidAmount += curr.paidAmount;
        acc.pendingAmount += curr.pendingAmount;
        return acc;
      }, { totalAmount: 0, paidAmount: 0, pendingAmount: 0 });

      // Calcula média mensal
      totalStats.avgMonthlyAmount = billingStats.length > 0 
        ? totalStats.totalAmount / billingStats.length 
        : 0;

      // Agrega dados de uso por organização
      const orgUsageStats = await Billing.aggregate([
        {
          $match: {
            organization: { $in: orgIds }
          }
        },
        {
          $unwind: '$usageBreakdown'
        },
        {
          $group: {
            _id: '$organization',
            totalUsageMinutes: { $sum: '$usageBreakdown.usageMinutes' },
            totalCost: { $sum: '$usageBreakdown.cost' },
            averageUsagePerUser: { $avg: '$usageBreakdown.usageMinutes' }
          }
        }
      ]);

      return res.status(200).json({
        success: true,
        data: {
          businessUnit,
          organizations: organizations.map(org => ({
            _id: org._id,
            name: org.name,
            login: org.login,
            avatarUrl: org.avatarUrl,
            costCenter: org.costCenter,
            description: org.description,
            usage: orgUsageStats.find(stat => stat._id.equals(org._id))
          })),
          stats: {
            ...totalStats,
            organizationCount: organizations.length,
            billingPeriods: billingStats
          }
        }
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas da business unit:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter estatísticas da business unit',
        error: error.message
      });
    }
  }

  /**
   * Atualiza a business unit de múltiplas organizações
   */
  async updateOrganizationsBusinessUnit(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { organizationIds, businessUnit } = req.body;

      if (!Array.isArray(organizationIds) || organizationIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de organizações inválida'
        });
      }

      const result = await Organization.updateMany(
        { _id: { $in: organizationIds } },
        { 
          $set: { 
            businessUnit,
            updatedAt: Date.now()
          }
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Business unit atualizada com sucesso',
        data: {
          modifiedCount: result.modifiedCount
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar business unit das organizações:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar business unit das organizações',
        error: error.message
      });
    }
  }

  /**
   * Lista todas as business units com suas estatísticas
   */
  async listBusinessUnitsStats(req, res) {
    try {
      const stats = await Organization.aggregate([
        {
          $lookup: {
            from: 'billings',
            localField: '_id',
            foreignField: 'organization',
            as: 'billings'
          }
        },
        {
          $group: {
            _id: '$businessUnit',
            organizations: { 
              $push: {
                _id: '$_id',
                name: '$name',
                login: '$login',
                avatarUrl: '$avatarUrl',
                costCenter: '$costCenter'
              }
            },
            totalAmount: { 
              $sum: { 
                $sum: '$billings.totalAmount' 
              }
            },
            paidAmount: {
              $sum: {
                $sum: {
                  $map: {
                    input: '$billings',
                    as: 'billing',
                    in: {
                      $cond: [
                        { $eq: ['$$billing.status', 'paid'] },
                        '$$billing.totalAmount',
                        0
                      ]
                    }
                  }
                }
              }
            }
          }
        },
        {
          $project: {
            businessUnit: '$_id',
            organizations: 1,
            organizationCount: { $size: '$organizations' },
            stats: {
              totalAmount: '$totalAmount',
              paidAmount: '$paidAmount',
              pendingAmount: { 
                $subtract: ['$totalAmount', '$paidAmount'] 
              }
            }
          }
        },
        { $sort: { 'stats.totalAmount': -1 } }
      ]);

      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error('Erro ao listar estatísticas das business units:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar estatísticas das business units',
        error: error.message
      });
    }
  }
}

module.exports = new OrganizationController();