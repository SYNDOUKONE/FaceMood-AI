# Makefile for FaceMood AI
# Provides convenient commands for development and deployment

.PHONY: help install dev up down build test clean

# Colors
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

# Default commands
help:
	@echo "FaceMood AI - Commandes disponibles:"
	@echo ""
	@echo "$(GREEN)=== Développement ===$(NC)"
	@echo "  make install    - Installer toutes les dépendances"
	@echo "  make dev        - Démarrer les serveurs en mode développement"
	@echo ""
	@echo "$(GREEN)=== Docker ===$(NC)"
	@echo "  make up         - Démarrer les conteneurs Docker"
	@echo "  make down       - Arrêter les conteneurs Docker"
	@echo "  make build      - Construire les images Docker"
	@echo ""
	@echo "$(GREEN)=== Tests ===$(NC)"
	@echo "  make test       - Exécuter tous les tests"
	@echo ""
	@echo "$(GREEN)=== Nettoyage ===$(NC)"
	@echo "  make clean      - Nettoyer les fichiers temporaires"
	@echo ""
	@echo "$(GREEN)=== Modèles ===$(NC)"
	@echo "  make download-model - Télécharger le modèle MediaPipe"
	@echo "  make generate-key   - Générer une clé de chiffrement"

# Install all dependencies
install:
	@echo "$(YELLOW)Installation des dépendances...$(NC)"
	@echo ""
	@cd backend && python -m venv venv && \
		source venv/bin/activate && \
		pip install -r requirements.txt && \
		deactivate
	@cd ../frontend && npm install
	@echo ""
	@echo "$(GREEN)Installation terminée!$(NC)"

# Start development servers
dev:
	@echo "$(YELLOW)Démarrage des serveurs en mode développement...$(NC)"
	@echo ""
	@echo "$(GREEN)Backend (FastAPI):$(NC) http://localhost:8000"
	@echo "$(GREEN)Frontend (React):$(NC)  http://localhost:5173"
	@echo "$(GREEN)API Docs:$(NC)        http://localhost:8000/docs"
	@echo ""
	@echo "Appuyez sur Ctrl+C pour arrêter"
	@echo ""
	@cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
	@cd ../frontend && npm run dev

# Start Docker containers
up:
	@echo "$(YELLOW)Démarrage des conteneurs Docker...$(NC)"
	@docker-compose up -d
	@echo ""
	@echo "$(GREEN)Application disponible à:$(NC) http://localhost:5173"
	@echo "$(GREEN)Backend API disponible à:$(NC) http://localhost:8000"

# Stop Docker containers
down:
	@echo "$(YELLOW)Arrêt des conteneurs Docker...$(NC)"
	@docker-compose down

# Build Docker images
build:
	@echo "$(YELLOW)Construction des images Docker...$(NC)"
	@docker-compose build

# Run tests
test:
	@echo "$(YELLOW)Exécution des tests...$(NC)"
	@cd backend && python -m pytest
	@cd ../frontend && npm test

# Clean temporary files
clean:
	@echo "$(YELLOW)Nettoyage des fichiers temporaires...$(NC)"
	@rm -rf backend/__pycache__
	@rm -rf backend/*.pyc
	@rm -rf backend/data/*.db
	@rm -rf backend/data/*.db-journal
	@rm -rf frontend/node_modules
	@rm -rf frontend/dist
	@rm -rf frontend/.vite
	@echo "$(GREEN)Nettoyage terminé!$(NC)"

# Download MediaPipe model
download-model:
	@echo "$(YELLOW)Téléchargement du modèle MediaPipe...$(NC)"
	@mkdir -p backend/models
	@python scripts/download_mediapipe_model.py

# Generate encryption key
generate-key:
	@echo "$(YELLOW)Génération d'une clé de chiffrement...$(NC)"
	@python scripts/generate_encryption_key.py

# Initialize database
init-db:
	@echo "$(YELLOW)Initialisation de la base de données...$(NC)"
	@cd backend && python -c "from app.core.database import init_db; import asyncio; asyncio.run(init_db())"
