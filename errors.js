function respondError403(res, next) {
  res.status(403);
  const error = new Error('You cannot access this resource');
  next(error);
}

function respondError404(res, next) {
  res.status(404);
  const error = new Error('Not found');
  next(error);
}

function respondError404_router(req, res, next) {
  res.status(404);
  const error = new Error('Not Found - ' + req.originalUrl);
  next(error);
}

function respondError422(res, next, message) {
  res.status(422);
  const error = new Error(message ?? 'Bad input');
  next(error);
}

function respondError500(res, next) {
  res.status(500);
  const error = new Error('Something happened! Try again.');
  next(error);
}

module.exports = {
  respondError403,
  respondError404,
  respondError404_router,
  respondError422,
  respondError500
}