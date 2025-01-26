import WorkflowNewApp from '../pages/new/workflow_new.vue';
import WorkflowIndexApp from '../pages/index/workflow_index.vue';
import WorkflowShowApp from '../pages/show/workflow_show.vue';

import { WORKFLOW_SHOW_APP, WORKFLOW_INDEX_APP, WORKFLOW_NEW_APP } from './constants';

export const createRoutes = () => {
  return [
    {
      name: WORKFLOW_INDEX_APP,
      path: '/',
      component: WorkflowIndexApp,
    },
    {
      name: WORKFLOW_NEW_APP,
      path: '/new',
      component: WorkflowNewApp,
      props: (route) => ({ initialState: route.params.initialState }),
    },
    {
      name: WORKFLOW_SHOW_APP,
      path: '/:workflowId(\\d+)',
      component: WorkflowShowApp,
    },
  ];
};
