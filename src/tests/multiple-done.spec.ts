import { MultipleDone } from './multiple-done';
import { MultipleDoneByCategory } from './multiple-done-by-category';

const runTest = (constructorName: string, createMultipleDone: (doneFn: DoneFn, times: number) => MultipleDone) => {
  describe(constructorName, () => {
    let multipleDone: MultipleDone;

    it('shoud fail with wrong doneFn', (done: DoneFn) => {
      try {
        multipleDone = createMultipleDone(null, null);
        done.fail();
      } catch (err) {
        expect(err.message).toBeDefined();
        done();
      }
    });

    it('shoud fail with wrong times (0)', (done: DoneFn) => {
      try {
        multipleDone = createMultipleDone(done, 0);
        done.fail();
      } catch (err) {
        expect(err.message).toBeDefined();
        done();
      }
    });

    it('shoud fail with wrong times (-1)', (done: DoneFn) => {
      try {
        multipleDone = createMultipleDone(done, -1);
        done.fail();
      } catch (err) {
        expect(err.message).toBeDefined();
        done();
      }
    });

    it('shoud fail with wrong times (null)', (done: DoneFn) => {
      try {
        multipleDone = createMultipleDone(done, null);
        done.fail();
      } catch (err) {
        expect(err.message).toBeDefined();
        done();
      }
    });

    it('shoud initialize correctly', (done: DoneFn) => {
      multipleDone = createMultipleDone(done, 1);

      expect(multipleDone).toBeDefined();
      multipleDone.done();
    });

    describe('done', () => {
      it('should handle 10 times', (done: DoneFn) => {
        multipleDone = createMultipleDone(done, 10);

        expect(multipleDone).toBeDefined();
        for (let i = 0; i < 10; i++) {
          multipleDone.done();
        }
      });
    });

    describe('fail', () => {
      let doneFailSpy: jasmine.Spy;

      beforeEach(() => {
        const done = ({ fail: null } as any) as DoneFn;
        doneFailSpy = spyOn(done, 'fail');

        multipleDone = createMultipleDone(done, 10);
      });

      it('should transmit fail to DoneFn.fail empty', () => {
        multipleDone.fail();
        expect(doneFailSpy).toHaveBeenCalled();
        expect(doneFailSpy).toHaveBeenCalledWith();
      });

      it('should transmit fail to DoneFn.fail with error', () => {
        multipleDone.fail('Error');
        expect(doneFailSpy).toHaveBeenCalled();
        expect(doneFailSpy).toHaveBeenCalledWith('Error');
      });

      it('should transmit fail to DoneFn.fail with error', () => {
        multipleDone.fail(new Error('Error'));
        expect(doneFailSpy).toHaveBeenCalled();
        expect(doneFailSpy).toHaveBeenCalledWith(new Error('Error'));
      });
    });
  });
};

runTest('MultipleDone', (done, times) => new MultipleDone(done, times));
runTest('MultipleDone as MultipleDoneByCategory',
  (done, times) => {
    const multipleDone = new MultipleDoneByCategory(done, { cat1: times });
    const currentDone = multipleDone.done.bind(multipleDone);
    multipleDone.done = () => currentDone('cat1');

    return multipleDone;
  });
