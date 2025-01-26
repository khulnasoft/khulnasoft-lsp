/* eslint-disable @typescript-eslint/no-explicit-any */
import { WorkflowAPI } from '@khulnasoft-lsp/workflow-api';
import { initWorkflowCommonController } from './workflow_common';

let workflowApiMock: any;

describe('WorkflowCommonController', () => {
  let workflowCommonController: any;

  beforeEach(() => {
    workflowApiMock = {
      getProjectPath: jest.fn(),
      isDockerImageAvailable: jest.fn(),
      pullDockerImage: jest.fn(),
    } as unknown as jest.Mocked<WorkflowAPI>;

    workflowCommonController = initWorkflowCommonController(workflowApiMock);
  });

  describe('getProjectPath', () => {
    beforeEach(() => {
      workflowApiMock.getProjectPath.mockResolvedValue('test-project');
    });

    it('should return the project path', async () => {
      expect(await workflowCommonController.getProjectPath()).toEqual({
        eventName: 'setProjectPath',
        data: 'test-project',
      });
    });
  });

  describe('verifyDockerImage', () => {
    describe.each`
      dockerImageAvailable | text             | expected
      ${true}              | ${'available'}   | ${[{ eventName: 'dockerConfigured', data: true }, { eventName: 'isDockerImageAvailable', data: true }]}
      ${false}             | ${'unavailable'} | ${[{ eventName: 'dockerConfigured', data: true }, { eventName: 'isDockerImageAvailable', data: false }]}
    `(`When docker image is $text`, ({ dockerImageAvailable, expected }) => {
      beforeEach(() => {
        workflowApiMock.isDockerImageAvailable.mockResolvedValue(dockerImageAvailable);
      });

      it('returns the expected payload', async () => {
        const results = await workflowCommonController.verifyDockerImage('test-image:latest');

        expect(workflowApiMock.isDockerImageAvailable).toHaveBeenCalledWith('test-image:latest');
        expect(workflowApiMock.pullDockerImage).not.toHaveBeenCalled();

        expect(results).toEqual(expected);
      });
    });

    describe('when docker errors', () => {
      it('returns not configured on connection error', async () => {
        workflowApiMock.isDockerImageAvailable.mockRejectedValue({ code: 'ENOENT' });
        const results = await workflowCommonController.verifyDockerImage('test-image:latest');

        expect(results).toEqual({ eventName: 'dockerConfigured', data: false });
      });

      it('returns generic error on other errors', async () => {
        workflowApiMock.isDockerImageAvailable.mockRejectedValue({ message: 'ERROR' });
        const results = await workflowCommonController.verifyDockerImage('test-image:latest');

        expect(results).toEqual({ eventName: 'workflowError', data: 'ERROR' });
      });
    });
  });

  describe('pullDockerImage', () => {
    beforeEach(() => {
      workflowApiMock.isDockerImageAvailable.mockResolvedValue(false);
    });
    it('should return when the pull has suceeded', async () => {
      workflowApiMock.pullDockerImage.mockResolvedValue();

      const results = await workflowCommonController.pullDockerImage('test-image:latest');

      expect(results).toEqual({
        eventName: 'pullDockerImageCompleted',
        data: {
          success: true,
        },
      });
    });
    it('should handle errors', async () => {
      workflowApiMock.pullDockerImage.mockRejectedValue(new Error('Pull failed'));

      const results = await workflowCommonController.pullDockerImage('test-image:latest');

      expect(results).toEqual({
        eventName: 'pullDockerImageCompleted',
        data: {
          success: false,
        },
      });
    });
  });
});
