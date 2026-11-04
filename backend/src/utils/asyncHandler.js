// Express 4 does not forward rejected promises to the error handler.
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next);
  };
}
