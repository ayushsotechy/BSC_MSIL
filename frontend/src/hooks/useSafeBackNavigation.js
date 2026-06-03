import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const SAFE_ROUTE_HISTORY_KEY = 'bsc_safe_route_history';
const LOGIN_PATH = '/login';

const readRouteHistory = () => {
  try {
    const value = JSON.parse(sessionStorage.getItem(SAFE_ROUTE_HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
};

const writeRouteHistory = (history) => {
  sessionStorage.setItem(SAFE_ROUTE_HISTORY_KEY, JSON.stringify(history.slice(-20)));
};

const isSafePath = (path) => path && !path.startsWith(LOGIN_PATH);

const useSafeBackNavigation = (fallbackPath = '/') => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    if (!isSafePath(currentPath)) return;

    const history = readRouteHistory();
    if (history[history.length - 1] !== currentPath) {
      writeRouteHistory([...history, currentPath]);
    }
  }, [location.hash, location.pathname, location.search]);

  return useCallback(() => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const history = readRouteHistory().filter(isSafePath);

    while (history.length && history[history.length - 1] === currentPath) {
      history.pop();
    }

    const previousPath = history.pop();
    writeRouteHistory(previousPath ? [...history, previousPath] : history);

    if (previousPath && previousPath !== currentPath) {
      navigate(previousPath);
      return;
    }

    navigate(isSafePath(fallbackPath) ? fallbackPath : '/', { replace: true });
  }, [fallbackPath, location.hash, location.pathname, location.search, navigate]);
};

export default useSafeBackNavigation;
