const axios = require('axios');

async function checkGitHubOrganizations(req, res, next) {
    if (!req.isAuthenticated() || !req.user.accessToken) {
        return next();
    }

    try {
        // Buscar organizações do usuário no GitHub
        const response = await axios.get('https://api.github.com/user/orgs', {
            headers: {
                'Authorization': `Bearer ${req.user.accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        // Salvar organizações na sessão
        req.session.githubOrgs = response.data.map(org => ({
            id: org.id,
            login: org.login,
            avatar_url: org.avatar_url,
            description: org.description
        }));

        // Se o usuário não selecionou uma organização e tem organizações disponíveis
        if (!req.session.selectedOrg && req.session.githubOrgs.length > 0) {
            // Redirecionar para a página de seleção de organização
            if (req.path !== '/api/auth/select-organization') {
                return res.redirect('/api/auth/select-organization');
            }
        }

        next();
    } catch (error) {
        console.error('Erro ao buscar organizações do GitHub:', error);
        next(error);
    }
}

module.exports = checkGitHubOrganizations;