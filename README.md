# FaceMood AI v2.0

**Système intelligent de détection, d'enregistrement et d'analyse des visages**

FaceMood AI est une application web moderne qui combine la détection faciale, la reconnaissance biométrique et l'analyse des expressions faciales en temps réel.

## 🚀 Fonctionnalités

### 🎯 Détection Faciale
- Détection en temps réel des visages via la webcam
- Extraction de 478 points caractéristiques (landmarks) avec MediaPipe
- Visualisation des points et du maillage facial
- Support multi-visages

### 👤 Enregistrement des Visages
- Enregistrement de nouveaux profils avec consentement explicite
- Capture de 5 images pour un embedding robuste
- Génération de représentations biométriques (embeddings) avec InsightFace
- Stockage sécurisé avec chiffrement des données

### 🔍 Reconnaissance Faciale
- Reconnaissance des visages enregistrés
- Calcul de similarité cosinus pour la comparaison
- Seuil de confiance configurable
- Gestion des visages inconnus

### 😊 Analyse des Expressions
- Analyse des expressions faciales en temps réel
- Détection de 12+ expressions différentes
- Utilisation des blendshapes MediaPipe
- Analyse géométrique des caractéristiques faciales

### 📊 Gestion des Profils
- Liste de tous les profils enregistrés
- Recherche par nom
- Modification des profils
- Suppression complète des données

## 🛠 Stack Technique

### Frontend
- **React 18** - Framework JavaScript
- **Vite** - Bundler ultra-rapide
- **Tailwind CSS** - Framework CSS
- **MediaPipe** - Détection faciale et landmarks
- **Lucide React** - Icônes

### Backend
- **FastAPI** - Framework Python pour les APIs
- **Python 3.10+** - Langage principal
- **InsightFace** - Génération d'embeddings faciaux
- **SQLAlchemy** - ORM pour la base de données
- **SQLite** - Base de données locale (par défaut)
- **PostgreSQL** - Base de données pour la production

### Computer Vision
- **MediaPipe Face Landmarker** - Détection des landmarks
- **InsightFace (ArcFace)** - Génération d'embeddings
- **OpenCV** - Traitement d'images

### Déploiement
- **Docker** - Conteneurisation
- **Docker Compose** - Orchestration
- **Nginx** - Serveur web pour le frontend

## 📁 Structure du Projet

```
FaceMood-AI/
├── backend/                  # Backend FastAPI
│   ├── app/
│   │   ├── main.py          # Point d'entrée FastAPI
│   │   ├── routes/          # Routes API
│   │   ├── services/        # Services (détection, embeddings, etc.)
│   │   ├── models/          # Modèles Pydantic
│   │   └── core/            # Configuration et base de données
│   ├── requirements.txt     # Dépendances Python
│   ├── Dockerfile           # Docker pour le backend
│   └── .env.example         # Exemple de configuration
│
├── frontend/                 # Frontend React
│   ├── src/
│   │   ├── components/      # Composants React
│   │   ├── pages/           # Pages
│   │   ├── services/        # Services API
│   │   ├── hooks/           # Hooks personnalisés
│   │   └── App.jsx          # Application principale
│   ├── package.json         # Dépendances npm
│   ├── vite.config.js       # Configuration Vite
│   └── Dockerfile           # Docker pour le frontend
│
├── docker-compose.yml       # Orchestration Docker
└── README.md                # Documentation
```

## 🚀 Installation et Démarrage

### Prérequis

- Python 3.10+
- Node.js 18+
- Docker et Docker Compose (optionnel)
- Git

### Installation Locale

#### 1. Cloner le dépôt

```bash
git clone <url-du-depot>
cd FaceMood-AI
```

#### 2. Configuration du Backend

```bash
# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Installer les dépendances
cd backend
pip install -r requirements.txt

# Générer une clé de chiffrement
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Créer un fichier .env
cp .env.example .env
# Modifier ENCRYPTION_KEY avec la clé générée
```

#### 3. Télécharger les modèles MediaPipe

Téléchargez le modèle `face_landmarker.task` depuis :
```bash
wget https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
mv face_landmarker.task backend/models/
```

#### 4. Configuration du Frontend

```bash
cd ../frontend
npm install
```

#### 5. Démarrer les serveurs

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Ouvrez votre navigateur à l'adresse : [http://localhost:5173](http://localhost:5173)

### Déploiement avec Docker

#### 1. Construire et démarrer les conteneurs

```bash
docker-compose up --build
```

#### 2. Accéder à l'application

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:8000](http://localhost:8000)
- Documentation API: [http://localhost:8000/docs](http://localhost:8000/docs)

#### 3. Arrêter les conteneurs

```bash
docker-compose down
```

## 🔧 Configuration

### Variables d'Environnement

| Variable | Description | Valeur par défaut |
|----------|-------------|------------------|
| `APP_NAME` | Nom de l'application | FaceMood AI |
| `APP_VERSION` | Version de l'application | 2.0.0 |
| `DEBUG` | Mode debug | False |
| `HOST` | Hôte du serveur | 0.0.0.0 |
| `PORT` | Port du serveur | 8000 |
| `DATABASE_URL` | URL de la base de données | sqlite+aiosqlite:///./data/face_database.db |
| `SECRET_KEY` | Clé secrète JWT | your-secret-key |
| `ENCRYPTION_KEY` | Clé de chiffrement Fernet | **À générer** |
| `INSIGHTFACE_MODEL_NAME` | Modèle InsightFace | antelopev2 |
| `RECOGNITION_THRESHOLD` | Seuil de reconnaissance | 0.6 |

### Génération de la Clé de Chiffrement

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Modèles de Computer Vision

- **MediaPipe Face Landmarker**: `face_landmarker.task`
  - Téléchargement: [Google Cloud Storage](https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task)
  - Placement: `backend/models/face_landmarker.task`

- **InsightFace**: Les modèles sont téléchargés automatiquement à la première utilisation

## 🎯 Utilisation

### 1. Détection Faciale

1. Activez la caméra en cliquant sur "Démarrer"
2. Positionnez votre visage devant la caméra
3. Les landmarks et le maillage facial s'affichent en temps réel

### 2. Enregistrement d'un Visage

1. Cliquez sur "Ajouter un visage"
2. Entrez un nom ou pseudonyme
3. Donnez votre consentement
4. Positionnez votre visage devant la caméra
5. Cliquez sur "Capturer 5 images"
6. L'application capturera automatiquement 5 images
7. Cliquez sur "Enregistrer" pour valider

### 3. Reconnaissance Faciale

1. Activez la détection en cliquant sur "Reconnaître"
2. Positionnez un visage enregistré devant la caméra
3. Le système reconnaîtra automatiquement la personne
4. Le résultat s'affichera avec un score de confiance

### 4. Analyse des Expressions

1. Positionnez votre visage devant la caméra
2. Cliquez sur "Analyser l'expression"
3. L'application analysera votre expression faciale
4. Le résultat s'affichera avec le nom de l'expression et un score de confiance

### 5. Gestion des Profils

- **Lister**: Accédez à la page "Profils" pour voir tous les profils enregistrés
- **Rechercher**: Utilisez la barre de recherche pour trouver un profil spécifique
- **Modifier**: Cliquez sur "Modifier" pour changer le nom d'un profil
- **Supprimer**: Cliquez sur "Supprimer" pour effacer un profil et ses données

## 🔒 Sécurité et Confidentialité

### Protection des Données

- **Chiffrement**: Toutes les représentations biométriques (embeddings) sont chiffrées avec Fernet (AES-128)
- **Stockage local**: Par défaut, les données sont stockées dans une base SQLite locale
- **Consentement**: Chaque enregistrement nécessite un consentement explicite
- **RGPD**: L'application respecte les principes du RGPD

### Bonnes Pratiques

1. **Ne partagez pas** votre clé de chiffrement
2. **Sauvegardez** régulièrement votre base de données
3. **Supprimez** les profils que vous n'utilisez plus
4. **Ne stockez pas** les images brutes (seuls les embeddings sont conservés)

## 📊 API REST

### Endpoints Principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | Vérifier l'état de l'API |
| GET | `/api/profiles/` | Lister tous les profils |
| POST | `/api/profiles/` | Créer un nouveau profil |
| GET | `/api/profiles/{id}` | Obtenir un profil spécifique |
| PUT | `/api/profiles/{id}` | Mettre à jour un profil |
| DELETE | `/api/profiles/{id}` | Supprimer un profil |
| POST | `/api/faces/detect` | Détecter des visages |
| POST | `/api/faces/enroll` | Enregistrer un nouveau visage |
| POST | `/api/recognize/` | Reconnaître un visage |
| POST | `/api/expressions/analyze` | Analyser une expression |

### Documentation Interactive

La documentation complète de l'API est disponible à : [http://localhost:8000/docs](http://localhost:8000/docs)

## 🧪 Tests

### Backend

```bash
cd backend
# Installer pytest
pip install pytest httpx

# Exécuter les tests
pytest
```

### Frontend

```bash
cd frontend
# Exécuter les tests
npm test
```

## 📦 Déploiement

### Production avec Docker

1. Modifiez le fichier `.env` avec vos configurations
2. Construisez les images:
   ```bash
   docker-compose -f docker-compose.yml build
   ```
3. Démarrez les conteneurs:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

### Avec PostgreSQL

1. Activez le profil production:
   ```bash
   docker-compose --profile production up -d
   ```
2. Configurez les variables d'environnement pour PostgreSQL

## 📝 Journal des Changements

### v2.0.0 (2024)
- Ajout de la fonctionnalité d'enregistrement des visages
- Intégration de InsightFace pour les embeddings
- Chiffrement des données biométriques
- Gestion complète des profils
- Analyse des expressions faciales
- Interface utilisateur améliorée

### v1.0.0 (2023)
- Détection faciale avec MediaPipe
- Affichage des landmarks
- Structure de base de l'application

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/ma-fonctionnalité`)
3. Commitez vos changements (`git commit -m 'Ajout de ma fonctionnalité'`)
4. Poussez vers la branche (`git push origin feature/ma-fonctionnalité`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- [MediaPipe](https://mediapipe.dev/) pour la détection faciale
- [InsightFace](https://github.com/deepinsight/insightface) pour les embeddings
- [FastAPI](https://fastapi.tiangolo.com/) pour le backend
- [React](https://react.dev/) pour le frontend
- [Tailwind CSS](https://tailwindcss.com/) pour le design

---

**FaceMood AI** - Analyse Faciale Intelligente

*Développé avec ❤️ pour la Computer Vision et le Deep Learning*
