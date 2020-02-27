import { MultipleDone } from './multiple-done';

export class MultipleDoneByCategory<TConfig = { [category: string]: number }> extends MultipleDone {
  private timesByCategory: TConfig;

  constructor(doneFn: DoneFn, timesByCategory: TConfig) {
    super(doneFn, timesByCategory && Object.keys(timesByCategory).reduce((agg, cat) => {
      const categoryTimes = timesByCategory[cat];
      if (typeof categoryTimes !== 'number') {
        throw new Error(`For timesByCategory ${JSON.stringify(timesByCategory)} category ${cat} times is not number.`);
      }

      return agg + categoryTimes;
    }, 0));

    this.timesByCategory = Object.assign({}, timesByCategory);
  }

  public done(category?: keyof TConfig, callbacks?: { [timesLeft: number]: (...args) => void }, ...args) {
    if (!category) {
      throw new Error('Please specify done category');
    }

    let timesLeft: number = this.timesByCategory[category] as any as number;
    this.timesByCategory[category] = --timesLeft as any;

    if (timesLeft < 0) {
      this.fail(`Too much done was called for category ${category}`);
      return;
    }

    if (callbacks) {
      const callbackForTimes = callbacks[timesLeft];

      callbackForTimes && callbackForTimes(...args);
    }

    super.done();
  }
}
