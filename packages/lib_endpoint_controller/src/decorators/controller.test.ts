import { Controller } from '../controller';
import { getControllerMetadata } from '../metadata';
import { controller } from './controller';

describe('controller decorator', () => {
  it('should set controller metadata with route', () => {
    @controller({ route: '$/test' })
    class TestController extends Controller {}

    const metadata = getControllerMetadata(TestController);
    expect(metadata).toEqual({ route: '$/test' });
  });

  it('should work without route option', () => {
    @controller({})
    class TestController extends Controller {}

    const metadata = getControllerMetadata(TestController);
    expect(metadata).toEqual({});
  });
});
