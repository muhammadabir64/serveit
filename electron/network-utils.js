const os = require('os');

function isPrivateIPv4(ip) {
  return ip.startsWith('10.') || ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

function interfaceScore(name, address) {
  let score = 0;
  const lower = String(name || '').toLowerCase();

  if (isPrivateIPv4(address)) score += 100;
  if (lower.includes('wi-fi') || lower.includes('wifi') || lower.includes('wlan')) score += 25;
  if (lower.includes('ethernet') || lower.includes('eth')) score += 20;
  if (lower.includes('virtual') || lower.includes('vmware') || lower.includes('vbox') || lower.includes('hyper-v')) score -= 40;
  if (lower.includes('loopback') || lower.includes('docker') || lower.includes('veth')) score -= 60;

  return score;
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, list] of Object.entries(interfaces)) {
    for (const item of list || []) {
      if (item.family !== 'IPv4' || item.internal) continue;
      candidates.push({
        address: item.address,
        score: interfaceScore(name, item.address),
      });
    }
  }

  if (candidates.length === 0) return '127.0.0.1';

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].address;
}

module.exports = { getLocalIP };
