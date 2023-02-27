/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
import { Type, type Static, type TObject } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

const requestTopic = 'zkfs:request';
const requestSchema = Type.Object({
  id: Type.String(),
  type: Type.Union([Type.RegEx(/getMap/u), Type.RegEx(/getValues/u)]),

  payload: Type.Object({
    key: Type.String(),
    account: Type.String(),
  }),
});
type RequestSchemaType = Static<typeof requestSchema>;

const responseTopicPrefix = 'zkfs:response-';
const responseSchema = Type.Object({
  payload: Type.Object({
    data: Type.String(),
  }),
});
type ResponseSchemaType = Static<typeof responseSchema>;

interface ValidatorFactoryReturn<T> {
  schema: TObject;
  verify: (data: T) => T;
}

function validatorFactory<T>(schema: TObject): ValidatorFactoryReturn<T> {
  const compiler = TypeCompiler.Compile(schema);

  const verify = function (data: T): T {
    const isValid = compiler.Check(data);
    if (isValid) {
      return data;
    }
    throw new Error(
      JSON.stringify(
        Array.from(compiler.Errors(data), ({ path, message }) => ({
          path,
          message,
        }))
      )
    );
  };

  return { schema, verify };
}

export type { RequestSchemaType, ResponseSchemaType };

export {
  validatorFactory,
  requestSchema,
  responseSchema,
  requestTopic,
  responseTopicPrefix,
};
