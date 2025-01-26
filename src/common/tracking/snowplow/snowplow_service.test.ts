import { DefaultConfigService } from '../../config_service';
import { LsFetch } from '../../fetch';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { log } from '../../log';
import { DefaultSnowplowService, SnowplowService } from './snowplow_service';
import { Emitter } from './emitter';

jest.useFakeTimers();

jest.mock('../../log');
jest.mock('./emitter');

const mockSchemaValidateFn = jest.fn();
jest.mock('ajv-draft-04', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      return {
        validate: mockSchemaValidateFn,
        addMetaSchema: jest.fn(),
      };
    }),
  };
});

const mockEmitterStart = jest.fn();
const mockEmitterStop = jest.fn();
const mockPost = jest.fn();

jest.mocked(Emitter).mockReturnValue(
  createFakePartial<Emitter>({
    start: mockEmitterStart,
    stop: mockEmitterStop,
    add: jest.fn(),
  }),
);

describe('SnowplowService', () => {
  let snowplowService: SnowplowService;
  const configService = new DefaultConfigService();
  const lsFetch = createFakePartial<LsFetch>({
    post: mockPost,
  });

  beforeEach(() => {
    mockSchemaValidateFn.mockReturnValue({ valid: true });
    snowplowService = new DefaultSnowplowService(lsFetch, configService);
    mockEmitterStart.mockReset();
    mockEmitterStop.mockReset();
  });

  describe('reconfigure', () => {
    it('should restart Emitter when `trackingUrl` is changed in config', async () => {
      expect(Emitter).toHaveBeenCalledTimes(1);
      configService.set('client.telemetry.trackingUrl', 'http://new.tracking.com');

      expect(mockEmitterStop).toHaveBeenCalled();
      await jest.runAllTimersAsync();
      expect(Emitter).toHaveBeenCalledTimes(2);
      expect(mockEmitterStart).toHaveBeenCalled();
    });

    it('should not restart Emitter when `trackingUrl` has not changed', async () => {
      expect(Emitter).toHaveBeenCalledTimes(1);
      configService.set('client.telemetry.trackingUrl', 'http://new.tracking.com');
      expect(mockEmitterStop).not.toHaveBeenCalled();
      await jest.runAllTimersAsync();
      expect(Emitter).toHaveBeenCalledTimes(1);
    });
  });

  describe('validate context', () => {
    it('should run ajv validate', () => {
      const mockSchema = { field: 'string' };
      const mockContext = { field: true };
      snowplowService.validateContext(mockSchema, mockContext);
      expect(mockSchemaValidateFn).toHaveBeenCalledWith(mockSchema, mockContext);
    });
  });

  describe('stop', () => {
    it('should stop emitter when `stop` called', () => {
      snowplowService.stop();
      expect(mockEmitterStop).toHaveBeenCalled();
    });
  });

  describe('trackEvent', () => {
    beforeAll(() => {
      jest.mocked(Emitter).mockImplementation(function (
        this: Emitter,
        ...args: ConstructorParameters<typeof Emitter>
      ) {
        const RealEmitter = jest.requireActual('./emitter').Emitter;
        return new RealEmitter(...args);
      });
    });

    const mockStructEvent = {
      category: 'test',
      action: 'test',
      label: 'test',
      value: 1,
    };

    beforeEach(() => {
      mockPost.mockReset();
    });

    it('should send the events to Snowplow when enabled', async () => {
      configService.set('client.telemetry.enabled', true);
      jest.mocked(mockPost).mockResolvedValueOnce({ status: 200 });
      await snowplowService.trackStructuredEvent(mockStructEvent, []);
      jest.runAllTimers();
      expect(lsFetch.post).toHaveBeenCalled();
      await snowplowService.stop();
    });

    it('should not send events to Snowplow when disabled', async () => {
      configService.set('client.telemetry.enabled', false);
      jest.mocked(mockPost).mockResolvedValueOnce({ status: 200 });
      await snowplowService.trackStructuredEvent(mockStructEvent, []);
      jest.runAllTimers();
      expect(lsFetch.post).not.toHaveBeenCalled();
      await snowplowService.stop();
    });

    it('should disable sending events when hostname cannot be resolved', async () => {
      configService.set('client.telemetry.enabled', true);

      jest.mocked(mockPost).mockClear();
      jest.mocked(mockPost).mockRejectedValueOnce({
        message: '',
        errno: 'ENOTFOUND',
      });

      await snowplowService.trackStructuredEvent(mockStructEvent, []);
      jest.runAllTimers();

      await snowplowService.stop();

      expect(log.info).toHaveBeenCalledWith(
        expect.stringContaining('Disabling telemetry, unable to resolve endpoint address.'),
      );

      jest.mocked(log.info).mockClear();
      await snowplowService.trackStructuredEvent(mockStructEvent, []);

      expect(log.info).not.toHaveBeenCalledWith();
    });
  });
});
