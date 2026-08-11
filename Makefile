.PHONY: up down migrate seed logs logs-api logs-web dev build check format

# Start all Docker services
up:
	docker compose up -d --build

# Stop all Docker services
down:
	docker compose down

# Run Prisma database migrations inside the running API container
migrate:
	docker compose exec api npm run prisma:deploy

# Run database seed inside the running API container
seed:
	docker compose exec api npm run db:seed

# Stream logs for all containers
logs:
	docker compose logs -f

# Stream logs for API
logs-api:
	docker compose logs -f api

# Stream logs for Web
logs-web:
	docker compose logs -f web

# Local development without Docker
dev:
	npm run dev

# Build all workspaces
build:
	npm run build

# Type check all workspaces
check:
	npm run check

# Prettier format check
format:
	npm run format
