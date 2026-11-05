import http from 'node:http';

const port = Number(process.env.PORT || 4173);
const request = http.get({
  hostname: '127.0.0.1',
  port,
  path: '/healthz',
  timeout: 4000,
  headers: {
    Host: `127.0.0.1:${port}`,
  },
}, response => {
  let body = '';
  response.setEncoding('utf8');
  response.on('data', chunk => {
    body += chunk;
    if (body.length > 2048) request.destroy(new Error('Unexpected health response.'));
  });
  response.on('end', () => {
    try {
      const status = JSON.parse(body);
      process.exit(response.statusCode === 200 && status.ok === true ? 0 : 1);
    } catch { process.exit(1); }
  });
});
request.on('timeout', () => request.destroy(new Error('Health check timed out.')));
request.on('error', error => {
  console.error(`Portfolio health check failed: ${error.code || error.message}`);
  process.exit(1);
});
