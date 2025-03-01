const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const passport = require('passport');
const checkGitHubOrganizations = require('../utils/github-org-middleware');

/**
 * Arquivo temporário para rotas de autenticação
 * Em uma implementação completa, esse arquivo teria as funções do controlador de autenticação
 */

// Rota para registro de usuário
router.post('/register', [
  check('name').notEmpty().withMessage('O nome é obrigatório'),
  check('email').isEmail().withMessage('Email inválido'),
  check('password').isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres')
], (req, res) => {
  // Implemente a lógica de registro aqui
  res.status(201).json({ success: true, message: 'Usuário registrado com sucesso' });
});

// Rota para login
router.post('/login', [
  check('email').isEmail().withMessage('Email inválido'),
  check('password').notEmpty().withMessage('A senha é obrigatória')
], (req, res) => {
  // Implemente a lógica de login aqui
  res.status(200).json({ success: true, message: 'Login realizado com sucesso' });
});

// Rota para logout
router.get('/logout', (req, res, next) => {
  // Limpar a organização selecionada
  if (req.session) {
    delete req.session.selectedOrg;
    delete req.session.githubOrgs;
  }
  
  req.logout(function(err) {
    if (err) { return next(err); }
    req.session.destroy();
    res.redirect('/');
  });
});

// Rota para autenticação OAuth com GitHub
router.get('/github', passport.authenticate('github', { 
  scope: ['user:email', 'read:org'] 
}));

// Rota de callback do GitHub OAuth
router.get('/github/callback', 
  passport.authenticate('github', { 
    failureRedirect: '/?error=auth-failed',
    failureFlash: true
  }),
  checkGitHubOrganizations,
  (req, res) => {
    // Atualizar a última data de login
    if (req.user) {
      req.user.lastLogin = new Date();
      req.user.save();
    }
    
    // Se não tiver organizações, redireciona para o dashboard
    if (!req.session.githubOrgs || req.session.githubOrgs.length === 0) {
      req.flash('warning', 'Você não pertence a nenhuma organização no GitHub.');
      return res.redirect('/dashboard');
    }
    
    // Redireciona para seleção de organização
    res.redirect('/api/auth/select-organization');
  }
);

// Rota para exibir página de seleção de organização
router.get('/select-organization', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }
  
  res.render('auth/select-organization', {
    title: 'Selecione uma Organização',
    organizations: req.session.githubOrgs || []
  });
});

// Rota para processar a seleção de organização
router.post('/select-organization', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }

  const { orgId, orgName } = req.body;
  
  if (!orgId || !orgName) {
    req.flash('error', 'Organização inválida selecionada.');
    return res.redirect('/api/auth/select-organization');
  }

  // Verificar se a organização está na lista de organizações do usuário
  const org = req.session.githubOrgs.find(org => org.id.toString() === orgId);
  if (!org) {
    req.flash('error', 'Organização não encontrada na sua lista de organizações.');
    return res.redirect('/api/auth/select-organization');
  }

  // Salvar a organização selecionada na sessão
  req.session.selectedOrg = {
    id: orgId,
    name: orgName
  };

  req.flash('success', `Organização ${orgName} selecionada com sucesso!`);
  res.redirect('/dashboard');
});

// Verificar status de autenticação
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({
      isAuthenticated: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar
      },
      selectedOrg: req.session.selectedOrg || null
    });
  }
  
  res.json({ isAuthenticated: false });
});

module.exports = router;