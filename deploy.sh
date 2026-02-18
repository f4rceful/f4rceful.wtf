#!/bin/bash
set -e

echo "Building frontend..."
npm run build

echo "Building server..."
cd server && npm run build && cd ..

echo "Uploading frontend..."
ssh vps "rm -rf /opt/f4rceful.wtf/dist"
scp -r dist vps:/opt/f4rceful.wtf/

echo "Uploading server..."
ssh vps "rm -rf /opt/f4rceful.wtf/server/dist"
scp -r server/dist vps:/opt/f4rceful.wtf/server/
scp server/package.json server/package-lock.json vps:/opt/f4rceful.wtf/server/

echo "Installing deps & restarting API..."
ssh vps "cd /opt/f4rceful.wtf/server && npm install --production && sudo systemctl restart f4rceful-api"

echo "Done!"
