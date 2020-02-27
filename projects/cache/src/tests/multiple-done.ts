export class MultipleDone {
  constructor(private readonly doneFn: DoneFn, private times: number) {
    if (!doneFn) {
      throw new Error('Please specify doneFn.');
    }
    if (!times || times <= 0) {
      throw new Error('Times should be positive integer number.');
    }
  }

  public done() {
    if (--this.times === 0) {
      expect(this.times).toBe(0);
      this.doneFn();
    }
  }

  public fail(error?: string | Error) {
    if (error) {
      this.doneFn.fail(error);
    } else {
      this.doneFn.fail();
    }
  }
}
