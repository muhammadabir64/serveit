const { EventEmitter } = require('events');
const localtunnel = require('localtunnel');

class TunnelManager extends EventEmitter {
  constructor() {
    super();
    this.tunnels = new Map();
    this.pendingStarts = new Map();
  }

  async start(serverId, port) {
    const existing = this.tunnels.get(serverId);
    if (existing?.url) {
      return { url: existing.url };
    }

    const pending = this.pendingStarts.get(serverId);
    if (pending) {
      return pending;
    }

    const startPromise = this.createTunnelWithRetry(serverId, port);
    this.pendingStarts.set(serverId, startPromise);

    try {
      return await startPromise;
    } finally {
      this.pendingStarts.delete(serverId);
    }
  }

  async createTunnelWithRetry(serverId, port) {
    await this.stop(serverId);

    let lastError = 'Failed to start public tunnel';

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const tunnel = await localtunnel({
          port,
          local_host: '127.0.0.1',
        });

        const url = tunnel?.url || '';

        if (!url) {
          try {
            tunnel.close();
          } catch {
            // ignore close errors
          }
          throw new Error('Tunnel URL not available');
        }

        tunnel.on('close', () => {
          const current = this.tunnels.get(serverId);
          if (current?.tunnel !== tunnel) return;
          this.tunnels.delete(serverId);
          this.emit('status', { serverId, url: '', error: 'Public tunnel disconnected' });
        });

        tunnel.on('error', (error) => {
          const message = error instanceof Error ? error.message : 'Public tunnel error';
          const current = this.tunnels.get(serverId);
          if (current?.tunnel === tunnel) {
            this.tunnels.delete(serverId);
            this.emit('status', { serverId, url: '', error: message });
          }
          try {
            tunnel.close();
          } catch {
            // ignore close errors
          }
        });

        this.tunnels.set(serverId, { tunnel, url, port });
        this.emit('status', { serverId, url, error: '' });
        return { url };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to start public tunnel';
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
      }
    }

    throw new Error(lastError);
  }

  async stop(serverId) {
    const pending = this.pendingStarts.get(serverId);
    if (pending) {
      try {
        await pending;
      } catch {
        // ignore pending start errors
      }
    }

    const entry = this.tunnels.get(serverId);
    if (!entry) return { stopped: false };

    this.tunnels.delete(serverId);
    try {
      entry.tunnel.close();
    } catch {
      // ignore close errors
    }
    this.emit('status', { serverId, url: '', error: '' });
    return { stopped: true };
  }

  async stopAll() {
    const ids = [...new Set([...this.pendingStarts.keys(), ...this.tunnels.keys()])];
    for (const id of ids) {
      await this.stop(id);
    }
    return { stoppedIds: ids };
  }
}

module.exports = new TunnelManager();
