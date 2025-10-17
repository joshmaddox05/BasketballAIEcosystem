.PHONY: dev test lint build clean setup install

# Development
dev:
	pnpm dev

dev-backend:
	pnpm dev:backend

dev-mobile:
	pnpm dev:mobile

# Testing
test:
	pnpm test

test-watch:
	pnpm test --watch

# Linting and formatting
lint:
	pnpm lint

lint-fix:
	pnpm lint:fix

# Building
build:
	pnpm build

type-check:
	pnpm type-check

# Setup and maintenance
setup: install
	pnpm prepare

install:
	pnpm install

clean:
	pnpm clean

# Docker (for future use)
docker-build:
	docker build -t basketball-ai-backend ./backend

docker-dev:
	docker-compose -f docker-compose.dev.yml up

# Database (for future use)
db-migrate:
	pnpm --filter backend db:migrate

db-seed:
	pnpm --filter backend db:seed

db-reset:
	pnpm --filter backend db:reset