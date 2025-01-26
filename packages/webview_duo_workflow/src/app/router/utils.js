import { createRoutes } from './routes';
import { WORKFLOW_SHOW_APP } from './constants';

export const getRoutesNames = () => {
  return createRoutes().map((route) => route.name);
};

export const isPageWithoutContainer = (pageName) => {
  const routes = getRoutesNames();

  if (!routes.includes(pageName)) {
    throw new Error(`Invalid page name: ${pageName}`);
  }

  return [WORKFLOW_SHOW_APP].includes(pageName);
};
