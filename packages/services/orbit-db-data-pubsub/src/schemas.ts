/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
import { Type, Static, TObject } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

const requestTopic = 'zkfs:request';

const getMapRequestSchema = Type.Object({
  id: Type.String(),
  type: Type.RegEx(/getMap/u),

  payload: Type.Object({
    map: Type.String(),
    account: Type.String(),
  }),
});
type getMapRequestSchemaType = Static<typeof getMapRequestSchema>;

const getMapResponseSchema = Type.Object({
  payload: Type.Object({ map: Type.String() }),
});
type getMapResponseSchemaType = Static<typeof getMapResponseSchema>;

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

export type { getMapRequestSchemaType, getMapResponseSchemaType };

export {
  validatorFactory,
  getMapRequestSchema,
  getMapResponseSchema,
  requestTopic,
};
