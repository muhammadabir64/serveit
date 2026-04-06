#!/bin/bash
set -e

for home in /home/*; do
  rm -f "$home/.local/share/nautilus/scripts/Serve with ServeIt"
done

rm -f "/usr/share/applications/serveit.desktop"
