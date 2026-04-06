const { Notification } = require('electron');

function canShow() {
  return Notification.isSupported();
}

function notify(title, body) {
  if (!canShow()) return;
  const n = new Notification({ title, body });
  n.show();
}

module.exports = { notify };
