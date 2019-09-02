import { MultipleDoneByCategory } from './multiple-done-by-category';

describe('MultipleDoneByCategory', () => {
  function createDoneSpy(): DoneFn & { doneSpy: jasmine.Spy, doneFailSpy: jasmine.Spy } {
    const doneSpy = jasmine.createSpy('done');
    const done = doneSpy as any;
    done.fail = null;
    const doneFailSpy = spyOn(done, 'fail');

    done.doneSpy = doneSpy;
    done.doneFailSpy = doneFailSpy;

    return done;
  }

  describe('constructor', () => {
    it('should fail if doneFn not specified', (done: DoneFn) => {
      try {
        const multipleDone = new MultipleDoneByCategory(null, null);
        expect(multipleDone).not.toBeDefined();
        done.fail();
      } catch (error) {
        expect(error.message).toBeDefined();
        done();
      }
    });

    it('should fail if timesByCategory not specified', (done: DoneFn) => {
      try {
        const multipleDone = new MultipleDoneByCategory(done, null);
        expect(multipleDone).not.toBeDefined();
        done.fail();
      } catch (error) {
        expect(error.message).toBeDefined();
        done();
      }
    });

    it('should fail if config is empty', (done: DoneFn) => {
      try {
        const multipleDone = new MultipleDoneByCategory(done, {});
        expect(multipleDone).not.toBeDefined();
        done.fail();
      } catch (error) {
        expect(error.message).toBeDefined();
        done();
      }
    });

    it('should fail if config category is not number', (done: DoneFn) => {
      try {
        const multipleDone = new MultipleDoneByCategory(done, { cat1: '' });
        expect(multipleDone).not.toBeDefined();
        done.fail();
      } catch (error) {
        expect(error.message).toBeDefined();
        done();
      }
    });

    it('should initialize succesfuly if at least one category is specified', (done: DoneFn) => {
      const mDone = new MultipleDoneByCategory(done, { cat1: 1 });
      expect(mDone).toBeDefined();
      done();
    });
  });

  describe('done', () => {
    it('should fail if category is not specified', (done: DoneFn) => {
      const testDone = createDoneSpy();

      const multipleDone = new MultipleDoneByCategory(testDone, { cat1: 2, cat2: 3 });

      try {
        multipleDone.done();
        done.fail();
      } catch (error) {
        expect(error.message).toBeDefined();
        done();
      }
    });

    it('should fail if category was done more times than expected', () => {
      const testDone = createDoneSpy();

      const multipleDone = new MultipleDoneByCategory(testDone, { cat1: 2, cat2: 3 });

      multipleDone.done('cat1');
      multipleDone.done('cat1');
      multipleDone.done('cat1');

      expect(testDone.doneFailSpy).toHaveBeenCalled();
    });

    it('should fail if zero category has been finished', () => {
      const testDone = createDoneSpy();

      const multipleDone = new MultipleDoneByCategory(testDone, { cat1: 2, cat2: 1, cat3: 0 });

      multipleDone.done('cat3');

      expect(testDone.doneFailSpy).toHaveBeenCalled();
    });

    it('should fail if category was done once again after success', () => {
      const testDone = createDoneSpy();

      const multipleDone = new MultipleDoneByCategory(testDone, { cat1: 2, cat2: 1, cat3: 1 });

      multipleDone.done('cat1');
      multipleDone.done('cat1');
      multipleDone.done('cat3');

      expect(testDone.doneSpy).not.toHaveBeenCalled();
      expect(testDone.doneFailSpy).not.toHaveBeenCalled();
      multipleDone.done('cat2');

      expect(testDone.doneSpy).toHaveBeenCalled();

      multipleDone.done('cat2');
      expect(testDone.doneFailSpy).toHaveBeenCalled();
    });

    it('should work fine when all categories are done', () => {
      const testDone = createDoneSpy();

      const multipleDone = new MultipleDoneByCategory(testDone, { cat1: 2, cat2: 1, cat3: 1 });

      multipleDone.done('cat1');
      multipleDone.done('cat1');
      multipleDone.done('cat3');

      expect(testDone.doneSpy).not.toHaveBeenCalled();
      multipleDone.done('cat2');

      expect(testDone.doneSpy).toHaveBeenCalled();
      expect(testDone.doneFailSpy).not.toHaveBeenCalled();
    });

    it('should call callback for times left', () => {
      const testDone = createDoneSpy();

      const callbacks = { 0: jasmine.createSpy(), 1: jasmine.createSpy(), 5: jasmine.createSpy() };

      const multipleDone = new MultipleDoneByCategory(testDone, { cat1: 3 });

      multipleDone.done('cat1', callbacks, 'arg11', 'arg12');
      multipleDone.done('cat1', callbacks, 'arg21', 'arg22');
      multipleDone.done('cat1', callbacks, 'arg31', 'arg32');

      expect(testDone.doneSpy).toHaveBeenCalledTimes(1);
      expect(testDone.doneFailSpy).not.toHaveBeenCalled();

      expect(callbacks[0]).toHaveBeenCalledTimes(1);
      expect(callbacks[0]).toHaveBeenCalledWith('arg31', 'arg32');
      expect(callbacks[1]).toHaveBeenCalledTimes(1);
      expect(callbacks[1]).toHaveBeenCalledWith('arg21', 'arg22');
      expect(callbacks[5]).not.toHaveBeenCalled();
    });
  });
});
