import { PLAN_TOOL_MESSAGE_MAP } from './planner';

describe('plan tool messages', () => {
  describe('set_task_status', () => {
    it.each`
      status           | message
      ${'Not Started'} | ${'Not started the current task'}
      ${'In Progress'} | ${'Started the current task'}
      ${'Completed'}   | ${'Completed the current task'}
      ${'Cancelled'}   | ${'Cancelled the current task'}
    `('shows the correct message for $status', ({ status, message }) =>
      expect(PLAN_TOOL_MESSAGE_MAP.set_task_status({ status })).toBe(message),
    );
  });
});
