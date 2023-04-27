/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
import { Type, type Static, type TObject } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

/* Defining a constant that is used to prefix the request topic. */
const requestTopic = 'zkfs:request';

/* Defining a schema for the request object. */
const requestSchema = Type.Object({
  id: Type.String(),

  type: Type.Union([
    Type.RegEx(/getMap/u),
    Type.RegEx(/getValues/u),
    Type.RegEx(/getWitness/u),
  ]),

  payload: Type.Object({
    key: Type.String(),
    account: Type.String(),
  }),
});
type RequestSchemaType = Static<typeof requestSchema>;

/* A constant that is used to prefix the response topic. */
const responseTopicPrefix = 'zkfs:response-';

/* Defining the response schema. */
const responseSchema = Type.Object({
  payload: Type.Object({
    data: Type.Union([Type.String(), Type.Null()]),
  }),
});
type ResponseSchemaType = Static<typeof responseSchema>;

/**
 * The `WitnessResponseData` interface is defining the structure of the
 * data that will be returned in the `witness` field of the response payload.
 */
interface WitnessResponseData {
  metadata: {
    root: string;
    value: string[];
  };
  witness: string;
}

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
  type WitnessResponseData
};
