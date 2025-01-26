import { getRoutesNames, isPageWithoutContainer } from './utils';
import { WORKFLOW_SHOW_APP } from './constants';

describe('utils', () => {
  describe('getRoutesNames', () => {
    it('should return an array of route names', () => {
      const routeNames = getRoutesNames();

      expect(Array.isArray(routeNames)).toBe(true);
      expect(routeNames.length).toBeGreaterThan(0);
      expect(routeNames).toContain(WORKFLOW_SHOW_APP);
    });
  });

  describe('isPageWithoutContainer', () => {
    it('should return true for WORKFLOW_SHOW_APP', () => {
      expect(isPageWithoutContainer(WORKFLOW_SHOW_APP)).toBe(true);
    });

    it('should return false for other valid page names', () => {
      const routeNames = getRoutesNames();
      const otherPageName = routeNames.find((name) => name !== WORKFLOW_SHOW_APP);
      if (otherPageName) {
        expect(isPageWithoutContainer(otherPageName)).toBe(false);
      }
    });

    it('should throw an error for invalid page names', () => {
      expect(() => isPageWithoutContainer('INVALID_PAGE_NAME')).toThrow(
        'Invalid page name: INVALID_PAGE_NAME',
      );
    });
  });
});
