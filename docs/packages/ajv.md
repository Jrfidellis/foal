# @foal/ajv

## `validate(schema: ObjectType, ajv = defaultInstance)`

Pre-hook to check the data received by the server. `Ajv` validates the `context.body` with the given schema. If the validation fails then an `BadRequestError` is thrown whose `details` are the validation errors.

You can provide your own instance of Ajv.