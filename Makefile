HOST  ?= vps
ROOT  ?= /opt/f4rceful.wtf

ssh = ssh $(HOST)
scp = scp -r

.PHONY: help deploy deploy-frontend deploy-api deploy-bot deploy-compose logs status restart

help:
	@echo "Available commands:"
	@echo "  make deploy           — full deploy (frontend + api + compose)"
	@echo "  make deploy-frontend  — build and upload frontend only"
	@echo "  make deploy-api       — build and redeploy API container"
	@echo "  make deploy-bot       — redeploy telegram bot container"
	@echo "  make deploy-compose   — sync docker-compose.yml to server"
	@echo "  make logs             — tail all container logs"
	@echo "  make status           — show container status"
	@echo "  make restart          — restart all containers"

deploy: deploy-frontend deploy-api

deploy-frontend:
	@echo "==> Building frontend..."
	npm run build
	@echo "==> Uploading frontend..."
	$(scp) dist $(HOST):$(ROOT)/

deploy-api:
	@echo "==> Building server..."
	cd server && npm run build && cd ..
	@echo "==> Uploading server..."
	$(ssh) "mkdir -p $(ROOT)/server"
	$(scp) server/dist server/package.json server/package-lock.json server/Dockerfile $(HOST):$(ROOT)/server/
	@echo "==> Restarting API container..."
	$(ssh) "cd $(ROOT) && docker compose up -d --build api"

deploy-bot:
	@echo "==> Uploading telegram bot..."
	$(scp) serv/telegram-bot $(HOST):$(ROOT)/
	$(ssh) "cd $(ROOT) && docker compose up -d --build telegram-bot"

deploy-compose:
	@echo "==> Syncing docker-compose.yml..."
	scp serv/docker-compose.yml $(HOST):$(ROOT)/docker-compose.yml

logs:
	$(ssh) "cd $(ROOT) && docker compose logs -f --tail=50"

status:
	$(ssh) "cd $(ROOT) && docker compose ps"

restart:
	$(ssh) "cd $(ROOT) && docker compose restart"
