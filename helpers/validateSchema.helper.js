function validateSchema(schema) {
  return (req, res, next) => {
    const result = schema.validate(req.body);

    if (result.error !== undefined) {
      return e.respondError422(res, next, result.error.message);
    }

    next();
  };
}

module.exports = validateSchema;