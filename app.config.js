// Variante de dev (APP_VARIANT=development, build local, voir DEVELOPMENT.md §7) : autre
// identifiant Android et autre nom, pour s'installer à côté de l'app publiée au lieu de la
// remplacer (un build local n'a pas la clé de signature EAS). Le reste vient d'app.json.
module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'development') return config;
  return {
    ...config,
    name: 'PostKeep Dev',
    android: { ...config.android, package: `${config.android.package}.dev` },
  };
};
