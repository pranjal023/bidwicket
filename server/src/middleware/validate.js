const { AppError } = require('../utils/errors');


const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.') || source}: ${i.message}`).join('; ');
    return next(new AppError('VALIDATION_ERROR', msg, 400));
  }
  req[source] = result.data;
  next();
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { validate, asyncHandler };
