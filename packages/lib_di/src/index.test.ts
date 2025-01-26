import {
  BrandedInstance,
  Container,
  Injectable,
  brandInstance,
  createCollectionId,
  createInterfaceId,
} from '.';

describe('Container', () => {
  interface A {
    a(): string;
  }

  interface B {
    b(): string;
  }

  interface C {
    c(): string;
  }

  const A = createInterfaceId<A>('A');
  const B = createInterfaceId<B>('B');
  const C = createInterfaceId<C>('C');

  @Injectable(A, [])
  class AImpl implements A {
    a = () => 'a';
  }

  @Injectable(B, [A])
  class BImpl implements B {
    #a: A;

    constructor(a: A) {
      this.#a = a;
    }

    b = () => `B(${this.#a.a()})`;
  }

  @Injectable(C, [A, B])
  class CImpl implements C {
    #a: A;

    #b: B;

    constructor(a: A, b: B) {
      this.#a = a;
      this.#b = b;
    }

    c = () => `C(${this.#b.b()}, ${this.#a.a()})`;
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('addInstances', () => {
    const O = createInterfaceId<object>('object');

    it('fails if the instance is not branded', () => {
      expect(() => container.addInstances({ say: 'hello' } as BrandedInstance<object>)).toThrow(
        /invoked without branded object/,
      );
    });

    it('adds instance', () => {
      const instance = { a: 'a' };
      const a = brandInstance(O, instance);
      container.addInstances(a);

      expect(container.get(O)).toBe(instance);
    });

    it('allows adding multiple instances of the same interface', () => {
      const instance1 = { a: 'a1' };
      const instance2 = { a: 'a2' };
      container.addInstances(brandInstance(O, instance1), brandInstance(O, instance2));

      expect(container.getAll(O)).toEqual([instance1, instance2]);
    });
  });

  describe('instantiate', () => {
    it('can instantiate three classes A,B,C', () => {
      container.instantiate(AImpl, BImpl, CImpl);

      const cInstance = container.get(C);
      expect(cInstance.c()).toBe('C(B(a), a)');
    });

    it('instantiates dependencies in multiple instantiate calls', () => {
      container.instantiate(AImpl);
      // the order is important for this test
      // we want to make sure that the stack in circular dependency discovery is being cleared
      // to try why this order is necessary, remove the `inStack.delete()` from
      // the `if (!cwd && instanceIds.includes(id))` condition in prod code
      expect(() => container.instantiate(CImpl, BImpl)).not.toThrow();
    });

    it('detects missing dependencies', () => {
      expect(() => container.instantiate(BImpl)).toThrow(
        /Class BImpl \(interface B\) depends on interfaces \[A]/,
      );
    });

    it('it uses existing instances as dependencies', () => {
      const aInstance = new AImpl();
      const a = brandInstance(A, aInstance);
      container.addInstances(a);

      container.instantiate(BImpl);

      expect(container.get(B).b()).toBe('B(a)');
    });

    it("detects classes what aren't decorated with @Injectable", () => {
      class AImpl2 implements A {
        a = () => 'hello';
      }

      expect(() => container.instantiate(AImpl2)).toThrow(
        /Classes \[AImpl2] are not decorated with @Injectable/,
      );
    });

    it('detects circular dependencies', () => {
      @Injectable(A, [C])
      class ACircular implements A {
        a = () => 'hello';

        constructor(c: C) {
          // eslint-disable-next-line no-unused-expressions
          c;
        }
      }

      expect(() => container.instantiate(ACircular, BImpl, CImpl)).toThrow(
        /Circular dependency detected between interfaces \(A,C\), starting with 'A' \(class: ACircular\)./,
      );
    });

    // this test ensures that we don't store any references to the classes and we instantiate them only once
    it('does not instantiate classes from previous instantiate call', () => {
      let globCount = 0;

      @Injectable(A, [])
      class Counter implements A {
        counter = globCount;

        constructor() {
          globCount++;
        }

        a = () => this.counter.toString();
      }

      container.instantiate(Counter);
      container.instantiate(BImpl);

      expect(container.get(A).a()).toBe('0');
    });

    it('fails when a dependency has multiple instances', () => {
      const aInstance1 = new AImpl();
      const aInstance2 = new AImpl();
      container.addInstances(brandInstance(A, aInstance1), brandInstance(A, aInstance2));

      expect(() => container.instantiate(BImpl)).toThrow(
        /Multiple instances found for A when exactly one was expected/,
      );
    });

    it('injects all available instances when using collection dependency', () => {
      interface D {
        d(): string;
      }
      const D = createInterfaceId<D>('D');
      const DCollection = createCollectionId(D);

      @Injectable(D, [])
      class DImpl1 implements D {
        d = () => 'd1';
      }

      @Injectable(D, [])
      class DImpl2 implements D {
        d = () => 'd2';
      }

      interface E {
        e(): string;
      }
      const E = createInterfaceId<E>('E');

      @Injectable(E, [DCollection])
      class EImpl implements E {
        constructor(private ds: D[]) {}

        e = () => `E(${this.ds.map((d) => d.d()).join(',')})`;
      }

      container.instantiate(DImpl1, DImpl2, EImpl);

      expect(container.getAll(D).length).toBe(2);

      expect(container.get(E).e()).toBe('E(d1,d2)');
    });
  });

  describe('get', () => {
    it('returns an instance of the interfaceId', () => {
      container.instantiate(AImpl);

      expect(container.get(A)).toBeInstanceOf(AImpl);
    });
    it('throws an error for missing dependency', () => {
      container.instantiate();

      expect(() => container.get(A)).toThrow(/Instance for interface 'A' is not in the container/);
    });

    it('throws when multiple instances exist', () => {
      const instance1 = new AImpl();
      const instance2 = new AImpl();

      container.addInstances(brandInstance(A, instance1), brandInstance(A, instance2));

      expect(() => container.get(A)).toThrow(
        /Multiple instances found for A. Use getAll\(A\) if you want to get all instances./,
      );
    });
  });

  describe('getAll', () => {
    it('returns empty array when no instances exist', () => {
      expect(container.getAll(A)).toEqual([]);
    });

    it('returns single instance in an array', () => {
      container.instantiate(AImpl);
      const instances = container.getAll(A);
      expect(instances).toHaveLength(1);
      expect(instances[0]).toBeInstanceOf(AImpl);
    });

    it('returns multiple instances when they exist', () => {
      @Injectable(A, [])
      class AImpl2 implements A {
        a = () => 'a2';
      }

      const aInstance1 = new AImpl();
      const aInstance2 = new AImpl2();

      container.addInstances(brandInstance(A, aInstance1), brandInstance(A, aInstance2));

      const instances = container.getAll(A);
      expect(instances).toHaveLength(2);
      expect(instances).toContain(aInstance1);
      expect(instances).toContain(aInstance2);
    });

    // NOTE: we might not need this functionality, but I do think that having a
    // test in place so that we are warned if this behavior changes is a good idea.
    it('returns instances in registration order', () => {
      @Injectable(A, [])
      class AImpl2 implements A {
        a = () => 'a2';
      }

      const aInstance1 = new AImpl();
      const aInstance2 = new AImpl2();

      container.addInstances(brandInstance(A, aInstance1), brandInstance(A, aInstance2));

      const instances = container.getAll(A);
      expect(instances[0].a()).toBe('a');
      expect(instances[1].a()).toBe('a2');
    });

    it('includes both manually added and instantiated instances', () => {
      @Injectable(A, [])
      class AImpl2 implements A {
        a = () => 'a2';
      }

      const aInstance = new AImpl();
      container.addInstances(brandInstance(A, aInstance));
      container.instantiate(AImpl2);

      const instances = container.getAll(A);
      expect(instances).toHaveLength(2);
      expect(instances[0]).toBe(aInstance);
      expect(instances[1]).toBeInstanceOf(AImpl2);
    });
  });
});
