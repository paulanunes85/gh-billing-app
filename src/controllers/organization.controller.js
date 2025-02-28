const Organization = require('../models/organization.model');
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
        tokenExpiresAt: req.body.tokenExpiresAt ? new Date(req.body.tokenExpiresAt) : null
      });
      
      await organization.save();
      
      return res.status(201).json({ 
        success: true, 
        message: 'Organização adicionada com sucesso', 
        data: { 
          id: organization._id, 
          name: organization.name,
          login: organization.login
        }
      });
    } catch (error) {
      console.error('Erro ao adicionar organização:', error);
      return res.status(500).json({ success: false, message: 'Erro ao adicionar organização', error: error.message });
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
}

module.exports = new OrganizationController();