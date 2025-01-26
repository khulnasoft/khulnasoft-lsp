import { initWorkflowConnectionController } from './workflow_connection';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let connectionMock: any;

describe('WorkflowCommonController', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let workflowConnectionController: any;

  beforeEach(() => {
    connectionMock = {
      sendNotification: jest.fn(),
    };

    workflowConnectionController = initWorkflowConnectionController(connectionMock);
  });

  it('sends the passed url to the connection', () => {
    workflowConnectionController.openUrl({ url: 'test' });

    expect(connectionMock.sendNotification).toHaveBeenCalledWith('$/gitlab/openUrl', {
      url: 'test',
    });
  });
});
