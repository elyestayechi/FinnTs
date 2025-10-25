# Finn AI Loan Analysis System - User Guide
# Overview

Finn is an AI-powered loan analysis system that automates risk assessment using machine learning and natural language processing. The system consists of:
-Backend API (FastAPI): Processes loan applications, performs risk analysis, and generates reports
-Frontend UI (React + TypeScript): Web interface for analysts to review loans and provide feedback
-Ollama Integration: Local LLM for advanced text analysis and reasoning
-Monitoring Stack: Prometheus, Grafana, and Alertmanager for observability
-Jenkins CI/CD: Automated build, test, and deployment pipeline

# Prerequisites

Before you begin, ensure you have:

-Docker and Docker Compose installed
-At least 8GB RAM available (for Ollama LLM)
-Git for cloning the repository
-(Optional) Jenkins for CI/CD automation

# Quick Start
# Option 1: Full Deployment with Docker Compose

# Clone the repository
git clone https://github.com/elyestayechi/Finnn.git
cd Finnn

# Start all services (application + monitoring)
docker compose up -d

# Or start only application services
docker compose -f docker-compose.app.yml up -d

# Option 2: Jenkins CI/CD Pipeline

Access Jenkins: http://localhost:9190
Create a new pipeline job pointing to your Git repository
Run the build - Jenkins will automatically:
Build Docker images
Run tests
Deploy the application
Perform health checks

# Important First-Time Setup
Database Migration Required!
After deployment, you MUST run the data migration to populate the SQLite database:

# Execute migrate_data.py inside the backend container
docker exec -it finn-backend-1 python migrate_data.py
What this does:

Migrates existing PDF reports to the database
Imports feedback data from JSON files
Creates analysis records from existing PDF content
Sets up the complete database schema
Without migration, your application will have:
✅ Running services
✅ Empty database
❌ No loan data
❌ No analysis history
❌ No feedback records

# Access Points
After successful deployment:

Service	URL	Purpose
Frontend	http://localhost:3000	Main web interface
Backend API	http://localhost:8000	REST API & Documentation
Ollama	http://localhost:11435	LLM service
Grafana	http://localhost:3001	Monitoring dashboards
Prometheus	http://localhost:9090	Metrics database
Alertmanager	http://localhost:9093	Alert management
Jenkins	http://localhost:9190	CI/CD pipeline

# Monitoring Setup
To enable the monitoring stack:

# Deploy monitoring services
docker compose -f docker-compose.monitoring.yml up -d

# Or use the Jenkins success message suggestion
docker compose -f docker-compose.monitoring.yml up -d
Default credentials:
Grafana: admin/admin or admin/admin123
Prometheus: no authentication
Alertmanager: no authentication

# Directory Structure
Finn/
├── Back/                 # Python FastAPI backend
│   ├── Data/            # Data files and databases
│   ├── PDF Loans/       # Generated PDF reports
│   ├── src/            # Source code
│   └── migrate_data.py  # CRITICAL: Data migration script
├── Front/              # React frontend
├── monitoring/         # Monitoring configuration
├── jenkins/           # CI/CD configuration
└── docker-compose.yml # Main deployment file

# Common Operations
Restart Services

docker compose restart
View Logs

# All services
docker compose logs

# Specific service
docker compose logs backend
docker compose logs frontend

Stop Services
docker compose down

# Pull latest changes
git pull origin main

# Rebuild and redeploy
docker compose up -d --build

# Troubleshooting
Database is Empty?

# Run migration inside backend container
docker exec -it $(docker compose ps -q backend) python migrate_data.py

Port Conflicts?
The pipeline automatically cleans up previous deployments, but if you need manual cleanup:
# Remove containers using Finn ports
for port in 8000 3000 11435 9090 9093 3001; do
    docker ps -q --filter "publish=$port" | xargs -r docker rm -f

Jenkins Pipeline Issues?
Check Docker permissions: sudo usermod -aG docker $USER

Restart Docker: sudo systemctl restart docker

Verify Jenkins can access Docker socket

# Monitoring Features
The system includes comprehensive monitoring:

Real-time metrics: CPU, memory, request rates

Business metrics: Loan analysis volume, success rates

Performance tracking: Processing times, error rates

Alerting: Service health, performance degradation

Dashboards: Pre-built Grafana dashboards

# API Usage
# Health check
curl http://localhost:8000/health

# API documentation
curl http://localhost:8000/docs

# Analyze a loan
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"loan_id": "12345", "customer_data": {...}}'

# Support
If you encounter issues:

Check logs: docker compose logs
Verify migration: Ensure migrate_data.py ran successfully
Check ports: Verify no conflicts on 3000, 8000, 11435
Resource check: Ensure enough RAM for Ollama LLM

# Remember: Always run migrate_data.py after first deployment to populate your database with existing loan data!