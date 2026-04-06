const net = require('net');

function checkPort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen({ port, host: '0.0.0.0' }, () => {
      server.close(() => resolve(port));
    });
  });
}

async function findFreePort(start = 8080, max = 65535) {
  for (let port = start; port <= max; port += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await checkPort(port);
      return port;
    } catch {
      // Try next port.
    }
  }
  throw new Error('No free port available');
}

module.exports = { findFreePort };
