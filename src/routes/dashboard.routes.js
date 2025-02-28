const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Billing = require('../models/billing.model');
const Organization = require('../models/organization.model');

// Rota principal do dashboard
router.get('/', async (req, res) => {
  try {
    // Buscando todas as organizações
    const organizations = await Organization.find().select('name login avatarUrl');
    
    // Buscando faturas pendentes
    const pendingBillings = await Billing.find({ status: 'pending' })
      .populate('organization', 'name login')
      .sort({ billingDate: 1 })
      .limit(5);
    
    // Calculando estatísticas gerais
    const stats = await calculateDashboardStats();
    
    res.render('dashboard/index', {
      title: 'Dashboard',
      organizations,
      pendingBillings,
      stats,
      user: req.user || null
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    req.flash('error', 'Erro ao carregar dados do dashboard');
    res.render('dashboard/index', { 
      title: 'Dashboard',
      error: 'Erro ao carregar dados do dashboard'
    });
  }
});

// Nova rota para dashboard de business units
router.get('/business-units', async (req, res) => {
  try {
    // Buscar todas as business units disponíveis
    const businessUnits = await Organization.distinct('businessUnit');
    
    // Organizações agrupadas por business unit
    const businessUnitsData = [];
    
    for (const unit of businessUnits) {
      // Organizações desta business unit
      const organizations = await Organization.find({ businessUnit: unit })
        .select('name login avatarUrl businessUnit costCenter');
      
      // IDs das organizações para buscar faturamentos
      const orgIds = organizations.map(org => org._id);
      
      // Estatísticas de faturamento para esta business unit
      const billingStats = await Billing.aggregate([
        { $match: { organization: { $in: orgIds } } },
        { $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$totalAmount", 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$totalAmount", 0] }
          }
        }}
      ]);
      
      // Buscar faturas recentes para esta business unit
      const recentBillings = await Billing.find({ organization: { $in: orgIds } })
        .populate('organization', 'name login businessUnit')
        .sort({ createdAt: -1 })
        .limit(5);
      
      // Dados consolidados para esta business unit
      businessUnitsData.push({
        name: unit,
        organizations,
        organizationCount: organizations.length,
        stats: billingStats.length > 0 ? billingStats[0] : {
          totalAmount: 0,
          pendingAmount: 0,
          paidAmount: 0
        },
        recentBillings
      });
    }
    
    // Estatísticas gerais
    const stats = await calculateDashboardStats();
    
    res.render('dashboard/business-units', {
      title: 'Dashboard - Business Units',
      businessUnitsData,
      stats,
      user: req.user || null
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard de business units:', error);
    req.flash('error', 'Erro ao carregar dados de business units');
    res.redirect('/dashboard');
  }
});

// Nova rota para visualizar business unit específica
router.get('/business-unit/:unit', async (req, res) => {
  try {
    const { unit } = req.params;
    
    // Organizações desta business unit
    const organizations = await Organization.find({ businessUnit: unit })
      .select('name login avatarUrl businessUnit costCenter description');
    
    if (organizations.length === 0) {
      req.flash('error', 'Business Unit não encontrada');
      return res.redirect('/dashboard/business-units');
    }
    
    // IDs das organizações para buscar faturamentos
    const orgIds = organizations.map(org => org._id);
    
    // Estatísticas de faturamento para esta business unit
    const billingStats = await Billing.aggregate([
      { $match: { organization: { $in: orgIds } } },
      { $group: {
        _id: null,
        totalAmount: { $sum: "$totalAmount" },
        pendingAmount: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$totalAmount", 0] }
        },
        paidAmount: {
          $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$totalAmount", 0] }
        },
        avgMonthlyAmount: { $avg: "$totalAmount" }
      }}
    ]);
    
    // Histórico de faturamento por mês para esta business unit
    const billingHistory = await Billing.aggregate([
      { $match: { organization: { $in: orgIds } } },
      { $sort: { year: -1, month: -1 } },
      { $group: {
        _id: { year: "$year", month: "$month" },
        totalAmount: { $sum: "$totalAmount" },
        pendingAmount: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$totalAmount", 0] }
        },
        paidAmount: {
          $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$totalAmount", 0] }
        },
        billings: { $push: "$$ROOT" }
      }},
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 }
    ]);
    
    // Buscar dados de faturamento por organização
    const orgBillingData = await Promise.all(organizations.map(async (org) => {
      const orgBillings = await Billing.find({ organization: org._id })
        .sort({ year: -1, month: -1 })
        .limit(6);
      
      const orgStats = await Billing.aggregate([
        { $match: { organization: org._id } },
        { $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$totalAmount", 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$totalAmount", 0] }
          }
        }}
      ]);
      
      return {
        organization: org,
        billings: orgBillings,
        stats: orgStats.length > 0 ? orgStats[0] : {
          totalAmount: 0,
          pendingAmount: 0,
          paidAmount: 0
        }
      };
    }));
    
    const stats = billingStats.length > 0 ? billingStats[0] : {
      totalAmount: 0,
      pendingAmount: 0,
      paidAmount: 0,
      avgMonthlyAmount: 0
    };
    
    res.render('dashboard/business-unit-detail', {
      title: `Dashboard - ${unit}`,
      businessUnit: unit,
      organizations,
      stats,
      billingHistory,
      orgBillingData,
      user: req.user || null
    });
    
  } catch (error) {
    console.error('Erro ao carregar detalhes da business unit:', error);
    req.flash('error', 'Erro ao carregar detalhes da business unit');
    res.redirect('/dashboard/business-units');
  }
});

// Rota para visão detalhada de uma organização
router.get('/organization/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar detalhes da organização
    const organization = await Organization.findById(id);
    
    if (!organization) {
      req.flash('error', 'Organização não encontrada');
      return res.redirect('/dashboard');
    }
    
    // Buscar histórico de faturamento
    const billingHistory = await Billing.find({ organization: id })
      .sort({ year: -1, month: -1 });
    
    // Calcular estatísticas específicas da organização
    const stats = await calculateOrganizationStats(id);
    
    res.render('dashboard/organization', {
      title: `Dashboard - ${organization.name}`,
      organization,
      billingHistory,
      stats
    });
  } catch (error) {
    console.error('Erro ao carregar detalhes da organização:', error);
    req.flash('error', 'Erro ao carregar detalhes da organização');
    res.redirect('/dashboard');
  }
});

// Função para calcular estatísticas do dashboard
async function calculateDashboardStats() {
  try {
    // Total de organizações
    const organizationCount = await Organization.countDocuments();
    
    // Total de faturas
    const billingCount = await Billing.countDocuments();
    
    // Total faturado
    const billingAggregate = await Billing.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$totalAmount", 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$totalAmount", 0] }
          }
        }
      }
    ]);
    
    const totalAmount = billingAggregate.length > 0 ? billingAggregate[0].totalAmount : 0;
    const pendingAmount = billingAggregate.length > 0 ? billingAggregate[0].pendingAmount : 0;
    const paidAmount = billingAggregate.length > 0 ? billingAggregate[0].paidAmount : 0;
    
    return {
      organizationCount,
      billingCount,
      totalAmount,
      pendingAmount,
      paidAmount
    };
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    return {
      organizationCount: 0,
      billingCount: 0,
      totalAmount: 0,
      pendingAmount: 0,
      paidAmount: 0
    };
  }
}

// Função para calcular estatísticas específicas de uma organização
async function calculateOrganizationStats(orgId) {
  try {
    // Total faturado para esta organização
    const billingAggregate = await Billing.aggregate([
      { $match: { organization: new mongoose.Types.ObjectId(orgId) } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$totalAmount", 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$totalAmount", 0] }
          },
          monthlyAverage: { $avg: "$totalAmount" }
        }
      }
    ]);
    
    const totalAmount = billingAggregate.length > 0 ? billingAggregate[0].totalAmount : 0;
    const pendingAmount = billingAggregate.length > 0 ? billingAggregate[0].pendingAmount : 0;
    const paidAmount = billingAggregate.length > 0 ? billingAggregate[0].paidAmount : 0;
    const monthlyAverage = billingAggregate.length > 0 ? billingAggregate[0].monthlyAverage : 0;
    
    return {
      totalAmount,
      pendingAmount,
      paidAmount,
      monthlyAverage
    };
  } catch (error) {
    console.error('Erro ao calcular estatísticas da organização:', error);
    return {
      totalAmount: 0,
      pendingAmount: 0,
      paidAmount: 0,
      monthlyAverage: 0
    };
  }
}

module.exports = router;