DC := docker compose -f docker-compose.dev.yml
DC_QSV := $(DC) -f docker-compose.dev.qsv.yml
EXEC := $(DC) exec videos

.PHONY: help up up-d up-qsv down restart log shell install db-migrate test test-watch \
	lint format format-check typecheck build check clean

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Development:"
	@echo "  up            Build and start the development stack"
	@echo "  up-d          Build and start the stack in the background"
	@echo "  up-qsv        Build and start with Intel Quick Sync on Linux"
	@echo "  down          Stop the development stack"
	@echo "  restart       Restart the application"
	@echo "  log           Follow application logs"
	@echo "  shell         Open a shell in the application container"
	@echo "  install       Reinstall dependencies from the lockfile"
	@echo "  db-migrate    Apply database migrations"
	@echo ""
	@echo "Verification:"
	@echo "  test          Run tests once"
	@echo "  test-watch    Run tests in watch mode"
	@echo "  lint          Run the linter"
	@echo "  format        Format files"
	@echo "  format-check  Check formatting"
	@echo "  typecheck     Run TypeScript checks"
	@echo "  build         Build the server and client"
	@echo "  check         Run the complete verification suite"
	@echo ""
	@echo "Cleanup:"
	@echo "  clean         Remove development containers, images, and volumes"

up:
	@$(DC) up --build

up-d:
	@$(DC) up --build -d

up-qsv:
	@$(DC_QSV) up --build

down:
	@$(DC) down

restart:
	@$(DC) restart videos

log:
	@$(DC) logs -f videos

shell:
	@$(EXEC) sh

install:
	@$(EXEC) npm ci

db-migrate:
	@$(EXEC) npm run db:migrate

test:
	@$(EXEC) npm test

test-watch:
	@$(EXEC) npm run test:watch

lint:
	@$(EXEC) npm run lint

format:
	@$(EXEC) npm run format

format-check:
	@$(EXEC) npm run format:check

typecheck:
	@$(EXEC) npm run typecheck

build:
	@$(EXEC) npm run build

check:
	@$(EXEC) npm run check

clean:
	@$(DC) down --rmi local --volumes --remove-orphans
