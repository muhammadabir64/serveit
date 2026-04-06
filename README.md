# ServeIt

<div align="center">

**A modern desktop app to serve folders instantly over LAN or share them worldwide with secure public tunnel links.**

[![Release](https://img.shields.io/github/v/release/muhammadabir64/serveit?label=latest%20release)](https://github.com/muhammadabir64/serveit/releases)
[![Downloads](https://img.shields.io/github/downloads/muhammadabir64/serveit/total)](https://github.com/muhammadabir64/serveit/releases)
[![License: GPL v3](https://img.shields.io/badge/license-GPLv3-blue.svg)](./LICENSE)
[![Issues](https://img.shields.io/github/issues/muhammadabir64/serveit)](https://github.com/muhammadabir64/serveit/issues)

</div>

---

## Why ServeIt

ServeIt helps you share any folder in seconds without dealing with server setup, CLI complexity, or deployment tooling.

Use it when you want to:

- preview static files quickly
- share a folder with devices on your network
- generate a public URL instantly for remote access
- add optional auth/cors/live-reload per server
- run multiple folder servers at once

---

## Feature Highlights

### Folder Serving (Fast Start)

- Add folder via:
  - drag and drop
  - folder picker
  - recent history
  - Right-click context menu (**Serve with ServeIt**)
- Automatic free-port selection
- Run multiple servers in parallel

### Sharing Options

- Local URL (`http://localhost:PORT`)
- LAN access URL (for other devices on same network)
- Public URL via one-click tunnel
- QR generation for quick mobile open

### Per-Server Controls

Each server can be configured independently:

- **CORS** toggle
- **Live Reload** toggle (auto refresh on file changes)
- **Basic Authentication** toggle (username/password)
- Request log stream with method/path/status/size

### App Experience

- System tray integration
- Desktop notifications
- Start/Stop all servers
- Light/Dark theme support
- Auto-updates from GitHub Releases (packaged builds)

---

## Screenshots

### 1) Main Dashboard

![ServeIt Main Dashboard](https://github.com/user-attachments/assets/5e472567-305e-4578-8e8b-771d867c6422)

### 2) Active Server Card Controls

![ServeIt Server Controls](https://github.com/user-attachments/assets/fecd4e8e-79c6-40de-8f3c-35fcb5d0780d)

### 3) Public Share + QR Modal

![ServeIt Public Share QR](https://github.com/user-attachments/assets/5914619c-a058-462a-b891-211a8b68eeac)

### 4) Settings + Defaults

![ServeIt Settings](https://github.com/user-attachments/assets/5d7973eb-31e7-4690-84de-7dbe6ceba7ce)

### 5) Web View

![ServeIt Web View](https://github.com/user-attachments/assets/11de8446-6f08-400e-8fff-c83731e3c3a1)

---

## Download

- **Windows Installer (.exe):**  
  https://github.com/muhammadabir64/serveit/releases
  
- **Linux (.deb):**  
  *coming soon*

---

## How to Use

### Basic flow

1. Open ServeIt
2. Add a folder
3. Server starts and gets a port automatically
4. Use local/LAN URL to access files
5. Enable **Public Share** if you need worldwide access

### Recommended workflow

1. Start with local/LAN sharing first
2. Enable auth before public sharing for sensitive content
3. Turn on live reload while editing files
4. Use request logs to debug access issues

---

## Development

### Run locally

```bash
npm install
npm run dev
```

### Build Windows

```bash
npm run dist:win
```

---

## Contributing

Contributions are welcome and appreciated.

- Check existing issues or open a new issue before large changes
- Fork the repo and create a focused branch
- Keep PRs small and include testing steps
- Run lint before submitting:

```bash
npm run lint
```

Full contribution guide: [`CONTRIBUTING.md`](./CONTRIBUTING.md)

---

## License

This project is licensed under the GNU General Public License v3.0. See [`LICENSE`](./LICENSE).

---

## Developer

- Website: https://muhammadabir64.netlify.app
- Repository: https://github.com/muhammadabir64/serveit
- Email: muhammadabir404@gmail.com
