import { createRoutes } from './routes';

describe('createRoutes', () => {
  it('returns the routes options', () => {
    const routes = createRoutes();

    expect(routes).toHaveLength(3);

    routes.forEach((route) => {
      expect(route).toHaveProperty('path');
      expect(route).toHaveProperty('name');
      expect(route).toHaveProperty('component');
    });
  });
});
