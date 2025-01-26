<script>
import { GlEmptyState } from '@khulnasoft/ui';
import { WORKFLOW_NEW_APP } from '../../../router/constants';
import emptyStateSvg from '@khulnasoft/svgs/dist/illustrations/tanuki-ai-md.svg';

export default {
  components: {
    GlEmptyState,
  },
  emptyStateSvg,
};
</script>
<template>
  <gl-empty-state class="gl-pt-20" :svgPath="$options.emptyStateSvg">
    <template #title>
      <h1 class="gl-mb-0 gl-mt-0 gl-text-size-h-display gl-leading-36 h4">
        Improve your workflow with KhulnaSoft Duo
      </h1>
    </template>
    <template #description>
      <p>
        Get started with AI-powered KhulnaSoft Duo Workflow. It has knowledge of your project and can
        help you draft and improve code.
      </p>
      <p>You haven't created a workflow in this project yet.</p>
    </template>
  </gl-empty-state>
</template>
