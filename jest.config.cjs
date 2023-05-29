/* eslint-disable no-undef */
/* eslint-disable import/unambiguous */
/* eslint-disable import/no-commonjs */
/** @type {import('ts-jest').JestConfigWithTsJest} */

module.exports = (packageDir) => ({
  rootDir: './../../',
  testMatch: [`${packageDir}/(src|test)/**/*.(spec|test).(js|jsx|ts|tsx)`],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '../../../node_modules/snarkyjs/dist/(.*)': '<rootDir>/node_modules/snarkyjs/dist/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
});
