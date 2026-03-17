const logger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    let statusColor;
    if (status >= 500) statusColor = '\x1b[31m';
    else if (status >= 400) statusColor = '\x1b[33m';
    else if (status >= 300) statusColor = '\x1b[36m';
    else statusColor = '\x1b[32m';

    const reset = '\x1b[0m';

    console.log(
      `${timestamp} | ` +
      `${req.method.padEnd(6)} | ` +
      `${statusColor}${status}${reset} | ` +
      `${duration}ms | ` +
      `${req.path} | ` +
      `→ ${req.headers['x-forwarded-host'] || 'internal'}`
    );
  });

  next();
};

module.exports = logger;
