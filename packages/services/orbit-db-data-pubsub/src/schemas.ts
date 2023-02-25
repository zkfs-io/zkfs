/* eslint-disable new-cap */
import { Type, Static, TObject } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

const getMapSchema = Type.Object({
  id: Type.String(),
  type: Type.RegEx(/getMap/u),

  payload: Type.Object({
    map: Type.String(),
    account: Type.String(),
  }),
});

interface ValidatorFactoryReturn<T> {
  schema: TObject;
  verify: (data: T) => T;
}

function validatorFactory<T extends unknown>(
  schema: TObject
): ValidatorFactoryReturn<T> {
  const compiler = TypeCompiler.Compile(schema);

  const verify = function (data: T): T {
    const isValid = compiler.Check(data);
    if (isValid) {
      return data;
    }
    throw new Error(
      JSON.stringify(
        [...compiler.Errors(data)].map(({ path, message }) => ({
          path,
          message,
        }))
      )
    );
  };

  return { schema, verify };
}

export type getMapSchemaType = Static<typeof getMapSchema>;

export { validatorFactory, getMapSchema };
