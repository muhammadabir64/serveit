#!/bin/bash
set -e

for home in /home/*; do
  DIR="$home/.local/share/nautilus/scripts"
  mkdir -p "$DIR"
  cat > "$DIR/Serve with ServeIt" << 'SCRIPT'
#!/bin/bash
/usr/bin/serveit --serve "$NAUTILUS_SCRIPT_SELECTED_FILE_PATHS"
SCRIPT
  chmod +x "$DIR/Serve with ServeIt"
done

DESKTOP_SRC="/opt/ServeIt/resources/build/serveit.desktop"
if [ -f "$DESKTOP_SRC" ]; then
  install -Dm644 "$DESKTOP_SRC" "/usr/share/applications/serveit.desktop"
fi

update-desktop-database /usr/share/applications/ 2>/dev/null || true
