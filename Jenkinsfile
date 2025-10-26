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

                # Copy data files into the Back directory structure
                echo "=== Copying data files ==="
                
                # Copy PDF files
                if [ -d "${LOCAL_DATA_PATH}/Back/${PDF_LOANS_DIR}" ]; then
                    cp -r "${LOCAL_DATA_PATH}/Back/${PDF_LOANS_DIR}/" "Back/${PDF_LOANS_DIR}/"
                    echo "✅ PDF Loans directory copied"
                    echo "PDF files count: $(find \"Back/${PDF_LOANS_DIR}/\" -name \"*.pdf\" | wc -l)"
                else
                    echo "⚠️ No PDF Loans directory found"
                fi

                # Copy Data directory
                if [ -d "${LOCAL_DATA_PATH}/Back/Data" ]; then
                    cp -r "${LOCAL_DATA_PATH}/Back/Data/" "Back/Data/"
                    echo "✅ Data directory copied"
                else
                    echo "⚠️ No Data directory found"
                fi

                # Copy database file if it exists
                if [ -f "${LOCAL_DATA_PATH}/Back/loan_analysis.db" ]; then
                    cp "${LOCAL_DATA_PATH}/Back/loan_analysis.db" "Back/"
                    echo "✅ Database file copied"
                else
                    echo "⚠️ No database file found - will be created during migration"
                fi

                # Copy vector database if it exists
                if [ -f "${LOCAL_DATA_PATH}/Back/loans_vector.db" ]; then
                    cp "${LOCAL_DATA_PATH}/Back/loans_vector.db" "Back/"
                    echo "✅ Vector database file copied"
                else
                    echo "⚠️ No vector database file found"
                fi

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
                echo "=== Deploying stack without Jenkins ==="

                # Use the working docker-compose.yml with BUILD_ID
                docker compose -p ${COMPOSE_PROJECT_NAME} -f docker-compose.yml up -d \
                  ollama backend frontend \
                  prometheus alertmanager grafana

                echo "✅ App + Monitoring deployed (Jenkins excluded)"
                '''
            }
        }

        stage('Debug Data Migration') {
            steps {
                sh '''
                echo "=== Debugging Data Migration ==="
                
                # Wait a bit for backend to start
                sleep 10
                
                # Check what files were actually copied in workspace
                echo "=== Files in Back/Data (workspace) ==="
                find Back/Data -type f 2>/dev/null | head -10 || echo "No files in Back/Data"
                
                echo "=== Files in Back/PDF Loans (workspace) ==="  
                find "Back/PDF Loans" -name "*.pdf" 2>/dev/null | head -5 || echo "No PDF files"
                
                echo "=== Database files (workspace) ==="
                ls -la Back/*.db 2>/dev/null || echo "No database files"
                
                # Check backend container file structure
                echo "=== Backend container files ==="
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la /app/ 2>/dev/null | head -15 || echo "Cannot access /app"
                echo "=== /app/data contents ==="
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la /app/data/ 2>/dev/null | head -10 || echo "No /app/data directory"
                echo "=== /app/PDF Loans contents ==="
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la "/app/PDF Loans/" 2>/dev/null | head -10 || echo "No PDF Loans directory"
                echo "=== Database files in container ==="
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la /app/*.db 2>/dev/null | head -5 || echo "No database files in container"
                
                # Check migration logs
                echo "=== Backend startup logs (migration) ==="
                docker compose -p ${COMPOSE_PROJECT_NAME} logs backend --tail=30
                
                # Check available API endpoints
                echo "=== Testing if backend is responsive ==="
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend curl -f http://localhost:8000/health && echo "✅ Backend health check passed" || echo "❌ Backend health check failed"
                
                echo "=== Available API endpoints from docs ==="
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend curl -s http://localhost:8000/docs 2>/dev/null | grep -o '"/api/[^"]*"' | sort | uniq | head -20 || echo "Cannot fetch API docs - trying OpenAPI JSON"
                
                # Alternative way to check endpoints
                echo "=== Checking OpenAPI spec ==="
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend curl -s http://localhost:8000/openapi.json 2>/dev/null | jq -r '.paths | keys[]' | grep "^/api" | head -20 || echo "Cannot fetch OpenAPI spec"
                '''
            }
        }


        stage('Health Check') {
            steps {
                sh '''
                echo "=== Health Check with retries ==="
                
                # Wait longer for backend to be ready (migration + server startup)
                echo "Waiting for backend to be ready..."
                MAX_RETRIES=20
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
                            
                            # Test data endpoints to verify migration worked
                            echo "=== Testing data endpoints ==="
                            echo "PDF reports count:"
                            PDF_COUNT=$(docker compose -p ${COMPOSE_PROJECT_NAME} exec -T backend curl -s http://localhost:8000/api/pdfs | jq -r '. | length' 2>/dev/null || echo "0")
                            echo "Loans count:"
                            LOAN_COUNT=$(docker compose -p ${COMPOSE_PROJECT_NAME} exec -T backend curl -s http://localhost:8000/api/loans | jq -r '. | length' 2>/dev/null || echo "0")
                            
                            echo "📊 PDF reports: $PDF_COUNT"
                            echo "📊 Loans data: $LOAN_COUNT"
                            
                            # Check if we have data
                            if [ "$PDF_COUNT" -gt "0" ] || [ "$LOAN_COUNT" -gt "0" ]; then
                                echo "✅ Data successfully loaded"
                                break
                            else
                                echo "⚠️ No data found yet (attempt $i/$MAX_RETRIES)"
                            fi
                        else
                            echo "⚠️ Backend running but health endpoint not responding (attempt $i/$MAX_RETRIES)"
                        fi
                    else
                        echo "⏳ Backend not running yet (attempt $i/$MAX_RETRIES)"
                    fi
                    
                    if [ $i -eq $MAX_RETRIES ]; then
                        echo "❌ Backend health check failed after $MAX_RETRIES attempts"
                        echo "=== Backend logs ==="
                        docker compose -p ${COMPOSE_PROJECT_NAME} logs backend --tail=50
                        echo "=== Container status ==="
                        docker compose -p ${COMPOSE_PROJECT_NAME} ps
                        exit 1
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
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la /app/data/ | head -10 || echo "Cannot list /app/data"
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la "/app/PDF Loans/" | head -10 || echo "Cannot list PDF Loans"
                docker compose -p ${COMPOSE_PROJECT_NAME} exec backend ls -la /app/*.db 2>/dev/null | head -5 || echo "No database files"
                
                # Check if data is accessible via API
                echo "=== Data API verification ==="
                echo "Testing PDF endpoint..."
                curl -s http://localhost:8000/api/pdfs | jq -r '. | length' || echo "PDF endpoint failed"
                echo "Testing loans endpoint..."
                curl -s http://localhost:8000/api/loans | jq -r '. | length' || echo "Loans endpoint failed"
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
            echo "=== Cleaning up failed deployment ==="
            docker compose -p ${COMPOSE_PROJECT_NAME} down 2>/dev/null || true
            '''
        }
    }
}