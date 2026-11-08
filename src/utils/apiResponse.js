const success = (res, data, statusCode = 200, meta = null) => {
  const response = { success: true, data };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
};

const error = (res, message, statusCode = 400, code = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(code && { code }),
  });
};

module.exports = {
  success,
  error,
};
