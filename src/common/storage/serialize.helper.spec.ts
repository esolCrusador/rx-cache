import { SerializeHelper } from './serialize.helper';

describe('SerializeHelper', () => {
  const testCases: { testData: any, result: string }[] = [
    { testData: [0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 1], result: '[0(6),3,3,0(5),1]' },
    { testData: [1, 2, 3, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 1], result: '[1,2,3,0(6),3,3,0(5),1]' },
    { testData: [1, 2, 3, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0], result: '[1,2,3,0(6),3,3,0(6)]' },
    { testData: [1, 2, 3, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0], result: '[1,2,3,0(6),3,3,0(6),3,0,0,0]' },
    {
      testData: [1, 2, 3, '00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00', 3, 3, '00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00'],
      result: '[1,2,3,"00:00:00"(6),3,3,"00:00:00"(6)]'
    },
    {
      testData: {
        arr1: [1, 2, 3, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0],
        arr2: [3],
        arr3: [0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 1]
      }, result: '{arr1:[1,2,3,0(6),3,3,0(6),3,0,0,0],arr2:[3],arr3:[0(6),3,3,0(5),1]}'
    },
  ];

  describe('serialize', () => {
    for (const testCase of testCases) {
      it(`should replace ${JSON.stringify(testCase.testData)} with result: "${testCase.result}"`, () => {
        expect(SerializeHelper.serialize(testCase.testData)).toBe(testCase.result);
      });
    }
  });

  describe('deserialize', () => {
    const twoSidesTestCases: any[] = [
      {'dasedas-21`': '31231231', 'dsadsadsa': '"qwdqweqw": 131wdas', 'dcsdfsd:': '5552:23"3213": 321'},
      [1, 2, 3, '00:00:00', '00:00:00.03212', '00:00:00', '00:00:00', '00:00:00', '00:00:00', 3, 3, '00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00.53212'],
    ];

    for (const testCase of twoSidesTestCases.concat(testCases.map(tc => tc.testData))) {
      it(`should serialize/deserialize object: ${JSON.stringify(testCase)}`, () => {
        expect(SerializeHelper.deserialize(SerializeHelper.serialize(testCase))).toEqual(testCase);
      });
    }
  });
});
