const legacyRouteRedirects = {
  '/login': '/vanilla/',
  '/admin/dashboard': '/vanilla/admin/',
  '/admin/access-credentials': '/vanilla/admin/',
  '/msil/dashboard': '/vanilla/msil/',
  '/msil/access-credentials': '/vanilla/msil/',
  '/dealer/dashboard': '/vanilla/dealer/',
};

const target = legacyRouteRedirects[window.location.pathname] || '/vanilla/';
window.location.replace(target);
