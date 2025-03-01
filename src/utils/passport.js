const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/user.model');

module.exports = function() {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Configuração da estratégia GitHub OAuth
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || "/api/auth/github/callback",
        scope: ['user:email', 'read:org']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Buscar usuário existente ou criar um novo
          let user = await User.findOne({ githubId: profile.id });
          
          if (!user) {
            // Criar novo usuário com dados do GitHub
            user = new User({
              githubId: profile.id,
              name: profile.displayName || profile.username,
              email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
              username: profile.username,
              avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
              accessToken: accessToken
            });
            await user.save();
          } else {
            // Atualizar token de acesso
            user.accessToken = accessToken;
            await user.save();
          }
          
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
};