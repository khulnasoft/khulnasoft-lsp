<script>
import { GlAlert } from '@khulnasoft/ui';
import { mapState, mapActions } from 'pinia';
import { useRequestErrorStore } from '../stores/request_error';

export default {
  components: {
    GlAlert,
  },
  computed: {
    ...mapState(useRequestErrorStore, ['requestError']),
  },
  watch: {
    requestError() {
      this.$emit('request-error');
    },
  },
  methods: {
    ...mapActions(useRequestErrorStore, ['resetRequestError']),
  },
};
</script>
<template>
  <gl-alert
    v-if="requestError"
    class="gl-my-3"
    variant="danger"
    :dismissible="true"
    @dismiss="resetRequestError"
    >{{ requestError }}</gl-alert
  >
</template>
