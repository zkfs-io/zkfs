import sdk from './index';

describe('sdk', () => {
  it('should test an example test case', () => {
    expect.assertions(1);

    const testString = 'test';
    const result = sdk(testString);

    expect(result).toBe(testString);
  });
});
