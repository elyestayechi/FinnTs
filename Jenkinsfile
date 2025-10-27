pipeline {
    agent any
    environment {
        DOCKER_HOST = 'unix:///var/run/docker.sock'
        COMPOSE_PROJECT_NAME = "finn-${BUILD_ID}"
        PATH = "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
        LOCAL_DATA_PATH = "/Users/asmatayechi/Desktop/Finn"
        PDF_LOANS_DIR = "PDF Loans"
    }

    stages {
        stage('Checkout & Prepare') {
            steps {
                git branch: 'main', url: 'https://github.com/elyestayechi/FinnTs.git'

                sh '''
                echo "=== Preparing workspace ==="
                mkdir -p Back/test-results Back/coverage

                # Create essential data directories if they don't exist
                mkdir -p "Back/Data" "Back/PDF Loans"

                # Copy data files with better error handling
                echo "=== Copying data files ==="
                
                # Copy PDF files - with fallback to creating sample data
                if [ -d "${LOCAL_DATA_PATH}/Back/${PDF_LOANS_DIR}" ] && [ "$(ls -A "${LOCAL_DATA_PATH}/Back/${PDF_LOANS_DIR}")" ]; then
                    echo "📂 Copying PDF files from local directory..."
                    cp -r "${LOCAL_DATA_PATH}/Back/${PDF_LOANS_DIR}/"* "Back/${PDF_LOANS_DIR}/" 2>/dev/null || true
                    echo "✅ PDF files copied: $(find \"Back/${PDF_LOANS_DIR}/\" -name \"*.pdf\" 2>/dev/null | wc -l) files"
                else
                    echo "⚠️ No PDF files found locally - PDF directory will be empty"
                    # Create a placeholder to ensure directory exists
                    touch "Back/${PDF_LOANS_DIR}/.keep"
                fi

                # Copy Data directory
                if [ -d "${LOCAL_DATA_PATH}/Back/Data" ] && [ "$(ls -A "${LOCAL_DATA_PATH}/Back/Data")" ]; then
                    echo "📂 Copying Data directory..."
                    cp -r "${LOCAL_DATA_PATH}/Back/Data/"* "Back/Data/" 2>/dev/null || true
                    echo "✅ Data directory copied"
                    
                    # Ensure essential files exist
                    if [ ! -f "Back/Data/KYC.LOV.csv" ]; then
                        echo "⚠️ KYC.LOV.csv not found - creating minimal version"
                        cat > "Back/Data/KYC.LOV.csv" << 'CSV'
Category,Item,Weight
Forme Juridique du B.EFFECTIF,SA,0
Forme Juridique du B.EFFECTIF,SUARL,0
Forme Juridique du B.EFFECTIF,SARL,0
Forme Juridique du B.EFFECTIF,Société Personne Physique,2
Forme Juridique du B.EFFECTIF,ONG,5
Forme Juridique du B.EFFECTIF,Autres,5
Raison de financement,Matériels et Equipements,0
Raison de financement,Moyens de transport,15
Raison de financement,Marchandises,0
Raison de financement,Produits agricoles,7.5
CSV
                    fi
                else
                    echo "⚠️ No Data directory found - creating minimal structure"
                    # Create essential data files
                    cat > "Back/Data/KYC.LOV.csv" << 'CSV'
Category,Item,Weight
Forme Juridique du B.EFFECTIF,SA,0
Forme Juridique du B.EFFECTIF,SUARL,0
Forme Juridique du B.EFFECTIF,SARL,0
Forme Juridique du B.EFFECTIF,Société Personne Physique,2
Forme Juridique du B.EFFECTIF,ONG,5
Forme Juridique du B.EFFECTIF,Autres,5
Raison de financement,Matériels et Equipements,0
Raison de financement,Moyens de transport,15
Raison de financement,Marchandises,0
Raison de financement,Produits agricoles,7.5
Raison de financement,Produits d'élevage,10
Raison de financement,Rénovation et amenagement,2.5
Raison de financement,Services,2.5
CSV
                    echo '{"feedback_entries": []}' > "Back/Data/feedback_db.json"
                    echo '{"analyses": []}' > "Back/Data/analyses.json"
                fi

                # Copy database files
                if [ -f "${LOCAL_DATA_PATH}/Back/loan_analysis.db" ]; then
                    cp "${LOCAL_DATA_PATH}/Back/loan_analysis.db" "Back/"
                    echo "✅ Database file copied"
                else
                    echo "ℹ️ No existing database - will be created during migration"
                fi

                if [ -f "${LOCAL_DATA_PATH}/Back/loans_vector.db" ]; then
                    cp "${LOCAL_DATA_PATH}/Back/loans_vector.db" "Back/"
                    echo "✅ Vector database file copied"
                else
                    echo "ℹ️ No vector database - will be created during operation"
                fi

                # Verify what was actually copied
                echo "=== Workspace verification ==="
                echo "Data files:"
                ls -la Back/Data/ 2>/dev/null | head -5 || echo "No data files"
                echo "PDF files:"
                ls -la "Back/PDF Loans/" 2>/dev/null | head -5 || echo "No PDF files"
                echo "Database files:"
                ls -la Back/*.db 2>/dev/null || echo "No database files"

                # Ensure Grafana dashboard files exist
                echo "=== Ensuring Grafana dashboards exist ==="
                if [ ! -f "monitoring/grafana/provisioning/dashboards/finn-compact-dashboard.json" ]; then
                    echo "⚠️ finn-compact-dashboard.json not found - creating placeholder"
                    mkdir -p "monitoring/grafana/provisioning/dashboards"
                    cat > "monitoring/grafana/provisioning/dashboards/finn-compact-dashboard.json" << 'DASHBOARD_JSON'
{
  "dashboard": {
    "id": null,
    "title": "Finn Compact Dashboard",
    "tags": ["finn", "loan-analysis"],
    "timezone": "browser",
    "panels": [],
    "version": 1
  },
  "message": "Dashboard created via provisioning"
}
DASHBOARD_JSON
                fi

                if [ ! -f "monitoring/grafana/provisioning/dashboards/finn-executive-dashboard.json" ]; then
                    echo "⚠️ finn-executive-dashboard.json not found - creating placeholder"
                    cat > "monitoring/grafana/provisioning/dashboards/finn-executive-dashboard.json" << 'DASHBOARD_JSON'
{
  "dashboard": {
    "id": null,
    "title": "Finn Executive Dashboard",
    "tags": ["finn", "executive"],
    "timezone": "browser",
    "panels": [],
    "version": 1
  },
  "message": "Dashboard created via provisioning"
}
DASHBOARD_JSON
                fi

                echo "=== Grafana dashboard files ==="
                ls -la "monitoring/grafana/provisioning/dashboards/" || echo "Could not list dashboards"
                '''
            }
        }

        stage('Debug Workspace') {
            steps {
                sh '''
                echo "=== Debug: Data Verification ==="
                pwd
                echo "=== Back directory contents ==="
                ls -la Back/
                echo "=== Data files ==="
                find Back/Data -type f 2>/dev/null | head -10 || echo "No data files"
                echo "=== PDF files ==="
                find "Back/PDF Loans" -name "*.pdf" 2>/dev/null | head -5 || echo "No PDF files"
                echo "=== Database files ==="
                ls -la Back/*.db 2>/dev/null || echo "No database files"
                '''
            }
        }

        stage('Build Backend') {
            steps {
                dir('Back') {
                    sh '''
                    echo "=== Building backend image ==="
                    docker build -t finn-backend:${BUILD_ID} -f Dockerfile .
                    echo "✅ Backend image built"
                    '''
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('Front') {
                    sh 'docker build -t finn-frontend:${BUILD_ID} -f Dockerfile .'
                }
            }
        }

        stage('Build Monitoring Images') {
            steps {
                sh '''
                echo "=== Building monitoring images ==="
                docker build -t finn-prometheus:${BUILD_ID} ./monitoring/prometheus
                docker build -t finn-alertmanager:${BUILD_ID} ./monitoring/alertmanager
                docker build -t finn-grafana:${BUILD_ID} ./monitoring/grafana
                echo "✅ Monitoring images built"
                '''
            }
        }

        stage('Cleanup Previous Containers') {
            steps {
                sh '''
                echo "=== Cleaning up old containers (except Jenkins) ==="
                
                # Stop and remove all containers except Jenkins
                RUNNING_CONTAINERS=$(docker ps -q --filter "name=jenkins" --format "{{.ID}}")
                if [ -n "$RUNNING_CONTAINERS" ]; then
                    echo "Keeping Jenkins container(s):"
                    docker ps --filter "name=jenkins"
                fi

                # Stop and remove all other containers
                docker ps -q | grep -v "$(docker ps -q --filter 'name=jenkins')" | xargs -r docker stop
                docker ps -a -q | grep -v "$(docker ps -q --filter 'name=jenkins')" | xargs -r docker rm -f

                # Clean up networks (but keep volumes for data persistence)
                docker network prune -f

                echo "✅ Old containers cleaned up (Jenkins untouched)"
                '''
            }
        }

        stage('Deploy Application with Monitoring') {
            steps {
                sh '''
                echo "=== Deploying stack with persistent data ==="
                
                # Verify data files are in workspace BEFORE deploying
                echo "=== Pre-deployment data verification ==="
                ls -la Back/Data/ | head -10 || echo "No Data directory"
                ls -la "Back/PDF Loans/" | head -5 || echo "No PDF Loans"
                ls -la Back/*.db || echo "No database files"
                
                # Deploy containers
                docker compose -p ${COMPOSE_PROJECT_NAME} -f docker-compose.yml up -d \
                  ollama backend frontend \
                  prometheus alertmanager grafana

                echo "✅ Deployment complete"
                
                # Give containers time to start
                sleep 15
                
                # Verify data is accessible inside container
                echo "=== Post-deployment verification ==="
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la /app/Data/ | head -10 || echo "Cannot access Data in container"
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la "/app/PDF Loans/" | head -5 || echo "Cannot access PDF Loans in container"
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la /app/*.db || echo "No DB files in container"
                '''
            }
        }

        stage('Verify Data Migration') {
            steps {
                sh '''
                echo "=== Verifying Data Migration ==="
                
                # Wait for backend to be ready
                sleep 30
                
                # Check migration status via API
                echo "Checking database stats..."
                docker compose -p ${COMPOSE_PROJECT_NAME} exec -T backend curl -s http://localhost:8000/api/stats || echo "Stats endpoint not available yet"
                
                # Check if we have any data
                echo "Checking PDF reports..."
                PDF_COUNT=$(docker compose -p ${COMPOSE_PROJECT_NAME} exec -T backend curl -s http://localhost:8000/pdf-reports/ | jq -r '. | length' 2>/dev/null || echo "0")
                echo "PDF reports found: $PDF_COUNT"
                
                echo "Checking analyses..."
                ANALYSIS_COUNT=$(docker compose -p ${COMPOSE_PROJECT_NAME} exec -T backend curl -s http://localhost:8000/api/analyses/recent?limit=1 | jq -r '. | length' 2>/dev/null || echo "0")
                echo "Analyses found: $ANALYSIS_COUNT"
                
                # If no data, it's not necessarily a failure - might be first deployment
                if [ "$PDF_COUNT" -eq "0" ] && [ "$ANALYSIS_COUNT" -eq "0" ]; then
                    echo "ℹ️ No existing data found - this might be a fresh deployment"
                else
                    echo "✅ Data migration successful"
                fi
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                echo "=== Health Check with retries ==="
                
                # Wait longer for backend to be ready (migration + server startup)
                echo "Waiting for backend to be ready..."
                MAX_RETRIES=15
                RETRY_DELAY=10
                BACKEND_HEALTHY=false
                
                for i in $(seq 1 $MAX_RETRIES); do
                    # Check if backend container is running
                    if docker compose -p ${COMPOSE_PROJECT_NAME} ps backend | grep -q "Up"; then
                        echo "✅ Backend container is running"
                        
                        # Test the actual health endpoint
                        if docker compose -p ${COMPOSE_PROJECT_NAME} exec -T backend curl -f http://localhost:8000/health; then
                            echo "✅ Backend health endpoint is responding"
                            BACKEND_HEALTHY=true
                            
                            # Test data endpoints to verify migration worked - USE CORRECT ENDPOINTS
                            echo "=== Testing data endpoints ==="
                            echo "PDF reports count:"
                            PDF_COUNT=$(docker compose -p ${COMPOSE_PROJECT_NAME} exec -T backend curl -s http://localhost:8000/pdf-reports/ | jq -r '. | length' 2>/dev/null || echo "0")
                            echo "Loans count:"
                            LOAN_COUNT=$(docker compose -p ${COMPOSE_PROJECT_NAME} exec -T backend curl -s http://localhost:8000/loans/ | jq -r '. | length' 2>/dev/null || echo "0")
                            
                            echo "📊 PDF reports: $PDF_COUNT"
                            echo "📊 Loans data: $LOAN_COUNT"
                            
                            # Check if we have data - but don't fail if we don't (fresh deployment)
                            if [ "$PDF_COUNT" -gt "0" ] || [ "$LOAN_COUNT" -gt "0" ]; then
                                echo "✅ Data successfully loaded"
                                break
                            else
                                echo "ℹ️ No data found yet - this might be a fresh deployment (attempt $i/$MAX_RETRIES)"
                                # If backend is healthy but no data, that's OK for fresh deployment
                                if [ $i -ge 5 ]; then
                                    echo "⚠️ Backend healthy but no data - continuing as this might be fresh deployment"
                                    break
                                fi
                            fi
                        else
                            echo "⚠️ Backend running but health endpoint not responding (attempt $i/$MAX_RETRIES)"
                        fi
                    else
                        echo "⏳ Backend not running yet (attempt $i/$MAX_RETRIES)"
                    fi
                    
                    if [ $i -eq $MAX_RETRIES ]; then
                        if [ "$BACKEND_HEALTHY" = "true" ]; then
                            echo "⚠️ Backend is healthy but no data found - this might be a fresh deployment"
                            # Don't fail the pipeline if backend is healthy but has no data
                            break
                        else
                            echo "❌ Backend health check failed after $MAX_RETRIES attempts"
                            echo "=== Backend logs ==="
                            docker compose -p ${COMPOSE_PROJECT_NAME} logs backend --tail=50
                            echo "=== Container status ==="
                            docker compose -p ${COMPOSE_PROJECT_NAME} ps
                            exit 1
                        fi
                    fi
                    sleep $RETRY_DELAY
                done

                # Check monitoring services
                echo "=== Checking monitoring services ==="
                
                if docker compose -p ${COMPOSE_PROJECT_NAME} ps prometheus | grep -q "Up"; then
                    echo "✅ Prometheus container is running"
                else
                    echo "⚠️ Prometheus container not running"
                    docker compose -p ${COMPOSE_PROJECT_NAME} logs prometheus --tail=20
                fi

                if docker compose -p ${COMPOSE_PROJECT_NAME} ps alertmanager | grep -q "Up"; then
                    echo "✅ Alertmanager container is running"
                else
                    echo "⚠️ Alertmanager container not running"
                    docker compose -p ${COMPOSE_PROJECT_NAME} logs alertmanager --tail=20
                fi

                if docker compose -p ${COMPOSE_PROJECT_NAME} ps grafana | grep -q "Up"; then
                    echo "✅ Grafana container is running"
                    
                    # Wait for Grafana to fully initialize
                    sleep 20
                    
                    # Check if Grafana is responding
                    if curl -s http://localhost:3001/api/health > /dev/null; then
                        echo "✅ Grafana health endpoint is responding"
                    else
                        echo "⚠️ Grafana container running but health endpoint not responding"
                    fi
                else
                    echo "⚠️ Grafana container not running"
                    docker compose -p ${COMPOSE_PROJECT_NAME} logs grafana --tail=20
                fi
                '''
            }
        }

        stage('Verify Data Persistence') {
            steps {
                sh '''
                echo "=== Verifying data persistence ==="
                
                # Check backend data directories
                echo "=== Backend data directories ==="
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la /app/Data/ | head -10 || echo "Cannot list /app/data"
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la "/app/PDF Loans/" | head -10 || echo "Cannot list PDF Loans"
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la /app/*.db 2>/dev/null | head -5 || echo "No database files"
                
                # Check if data is accessible via API - USE CORRECT ENDPOINTS
                echo "=== Data API verification ==="
                echo "Testing PDF endpoint..."
                curl -s http://localhost:8000/pdf-reports/ | jq -r '. | length' || echo "PDF endpoint failed or returned no data"
                echo "Testing loans endpoint..."
                curl -s http://localhost:8000/loans/ | jq -r '. | length' || echo "Loans endpoint failed or returned no data"
                echo "Testing analyses endpoint..."
                curl -s http://localhost:8000/api/analyses/recent?limit=5 | jq -r '. | length' || echo "Analyses endpoint failed or returned no data"
                '''
            }
        }

        stage('Verify Grafana Provisioning') {
            steps {
                sh '''
                echo "=== Verifying Grafana provisioning ==="
                sleep 30
                
                # Check if datasource was created
                echo "Grafana datasources:"
                curl -s http://localhost:3001/api/datasources -u admin:admin | jq -r '.[].name' 2>/dev/null || echo "Could not fetch datasources"
                
                # Check if dashboards were created
                echo "Grafana dashboards:"
                curl -s http://localhost:3001/api/search -u admin:admin | jq -r '.[].title' 2>/dev/null || echo "Could not fetch dashboards"
                
                echo "✅ Grafana provisioning verification complete"
                '''
            }
        }
    }

    post {
        success {
            sh '''
            echo "🎉 DEPLOYMENT SUCCESSFUL! 🎉"
            echo ""
            echo "=== APPLICATION SERVICES ==="
            echo "Frontend:     http://localhost:3000"
            echo "Backend API:  http://localhost:8000"
            echo "API Docs:     http://localhost:8000/docs"
            echo "Ollama:       http://localhost:11435"
            echo ""
            echo "=== MONITORING SERVICES ==="
            echo "Grafana:      http://localhost:3001 (admin/admin)"
            echo "Prometheus:   http://localhost:9090"
            echo "Alertmanager: http://localhost:9093"
            echo ""
            echo "=== GRAFANA DASHBOARDS ==="
            echo "1. Open Grafana: http://localhost:3001"
            echo "2. Login with admin/admin"
            echo "3. Go to Dashboards → Browse"
            echo "4. Look for 'Finn Compact Dashboard' and 'Finn Executive Dashboard'"
            echo ""
            echo "If dashboards don't appear immediately, wait 1-2 minutes for provisioning"
            echo ""
            echo "=== TROUBLESHOOTING ==="
            echo "If no data appears in the application:"
            echo "1. This might be a fresh deployment with no existing data"
            echo "2. Try creating a new loan analysis from the frontend"
            echo "3. Check backend logs: docker compose -p ${COMPOSE_PROJECT_NAME} logs backend"
            '''
        }
        failure {
            sh '''
            echo "=== Deployment failed - troubleshooting info ==="
            echo "=== Backend logs ==="
            docker compose -p ${COMPOSE_PROJECT_NAME} logs backend --tail=100 2>/dev/null || true
            echo "=== Prometheus logs ==="
            docker compose -p ${COMPOSE_PROJECT_NAME} logs prometheus --tail=50 2>/dev/null || true
            echo "=== Grafana logs ==="
            docker compose -p ${COMPOSE_PROJECT_NAME} logs grafana --tail=50 2>/dev/null || true
            echo "=== Container status ==="
            docker compose -p ${COMPOSE_PROJECT_NAME} ps 2>/dev/null || true
            echo "=== Cleaning up failed deployment ==="
            docker compose -p ${COMPOSE_PROJECT_NAME} down 2>/dev/null || true
            '''
        }
    }
}