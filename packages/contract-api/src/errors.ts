/* A map of error messages. */
const errors = {
  contractNotFound: () => new Error('Contract not found'),
  keyNotFound: () => new Error('Key not found'),
  rootHashNotFound: () => new Error('Root hash not found'),
  valueTypeNotFound: () => new Error('Value type not found'),

  valueFieldsNotFound: () =>
    new Error('Value fields not found in virtual storage'),

  valueNotFound: () => new Error('Value not found in virtual storage'),
  virtualStorageNotFound: () => new Error('Virtual storage not found'),
  parentMapNotFound: () => new Error('Parent map not found'),
  witnessNotFound: () => new Error('Witness not found'),
};

export default errors;
