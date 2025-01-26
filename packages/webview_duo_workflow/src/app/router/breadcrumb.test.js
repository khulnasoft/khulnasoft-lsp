import { shallowMount } from '@vue/test-utils';
import { GlBreadcrumb } from '@khulnasoft/ui';
import Breadcrumb from './breadcrumb.vue';
import { WORKFLOW_INDEX_APP, WORKFLOW_NEW_APP, WORKFLOW_SHOW_APP } from './constants';

describe('Breadcrumb', () => {
  let wrapper;

  const createWrapper = (router) => {
    wrapper = shallowMount(Breadcrumb, {
      mocks: {
        $route: router,
      },
    });
  };

  const findBreadcrumbs = () => wrapper.findComponent(GlBreadcrumb);

  it.each`
    items                                                                      | router
    ${[{ text: 'KhulnaSoft Duo Workflow', to: '/' }]}                              | ${{ name: WORKFLOW_INDEX_APP }}
    ${[{ text: 'KhulnaSoft Duo Workflow', to: '/' }, { text: 'New', to: '/new' }]} | ${{ name: WORKFLOW_NEW_APP }}
    ${[{ text: 'KhulnaSoft Duo Workflow', to: '/' }, { text: '1', to: '/1' }]}     | ${{ name: WORKFLOW_SHOW_APP, params: { workflowId: '1' } }}
  `('shows the right breadcrumbs for route $router.name', ({ items, router }) => {
    createWrapper(router);

    const breadcrumbs = findBreadcrumbs();

    expect(breadcrumbs.props('items')).toEqual(items);
  });
});
