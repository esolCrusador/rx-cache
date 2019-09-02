export class SerializeHelper {


  private static zeroReplaceRegexp = SerializeHelper.getReplaceRegexp('0');
  private static zeroTimeReplaceRegexp = SerializeHelper.getReplaceRegexp('"00:00:00"');
  private static keyCleanupRegexp = /"(\w+)":/g;

  private static zeroEnrichReplaceRegexp = SerializeHelper.getInrichRegexp('0');
  private static zeroEnrichTimeReplaceRegexp = SerializeHelper.getInrichRegexp('"00:00:00"');
  private static keyEnrichRegexp = /([,{])(\w+):/g;
  private static replaceRounds(separator1: string, values: string, separator2: string, targetValue: string): string {
    const isEnding = values.length % (targetValue.length + 1) !== 0;
    return `${separator1}${targetValue}(${Math.ceil(values.length / (targetValue.length + 1))})${isEnding ? '' : ','}${separator2}`;
  }
  private static getReplaceRegexp(targetValue: string): RegExp {
    return new RegExp(`([^${targetValue}])((${targetValue},){3,}${targetValue}?)([^${targetValue}])`, 'g');
  }

  public static serialize<TEntity>(obj: TEntity): string {
    const objStr = JSON.stringify(obj);
    if (!objStr) {
      return objStr;
    }

    return objStr.replace(SerializeHelper.keyCleanupRegexp, (f, g) => `${g}:`)
      .replace(SerializeHelper.zeroReplaceRegexp, (_f, separator1, zeroes, _g, separator2) => {
        return SerializeHelper.replaceRounds(separator1, zeroes, separator2, '0');
      })
      .replace(SerializeHelper.zeroTimeReplaceRegexp, (_f, separator1, zeroes, _g, separator2) => {
        return SerializeHelper.replaceRounds(separator1, zeroes, separator2, '"00:00:00"');
      });
  }

  private static getInrichRegexp(targetValue: string): RegExp {
    return new RegExp(`${targetValue}\\((\\d+)\\)`, 'g');
  }
  private static enrichRounds(countStr: string, targetValue: string) {
    const count = +countStr;

    const valuesArray = new Array(count);
    for (let i = 0; i < count; i++) {
      valuesArray[i] = targetValue;
    }

    return valuesArray.join(',');
  }

  public static deserialize<TEntity>(value: string): TEntity {
    value = value.replace(this.keyEnrichRegexp, (f, separator: string, g: string) => `${separator}"${g}":`)
      .replace(SerializeHelper.zeroEnrichReplaceRegexp, (f, count) => SerializeHelper.enrichRounds(count, '0'))
      .replace(SerializeHelper.zeroEnrichTimeReplaceRegexp, (f, count) => SerializeHelper.enrichRounds(count, '"00:00:00"'));

    return JSON.parse(value);
  }
}
