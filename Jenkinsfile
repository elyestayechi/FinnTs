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

                # CRITICAL: DO NOT create empty directories - only copy existing data
                echo "=== Verifying local data exists ==="
                
                if [ ! -d "${LOCAL_DATA_PATH}/Back" ]; then
                    echo "❌ FATAL: Local data path not found: ${LOCAL_DATA_PATH}/Back"
                    echo "Please ensure your data exists at this location before running the pipeline"
                    exit 1
                fi

                # Copy PDF files - FAIL if not found
                echo "=== Copying PDF files ==="
                if [ -d "${LOCAL_DATA_PATH}/Back/${PDF_LOANS_DIR}" ]; then
                    # Ensure target directory exists
                    mkdir -p "Back/${PDF_LOANS_DIR}"
                    
                    # Copy all PDF files
                    cp -r "${LOCAL_DATA_PATH}/Back/${PDF_LOANS_DIR}/"* "Back/${PDF_LOANS_DIR}/" 2>&1 || {
                        echo "⚠️ Warning: Some files couldn't be copied"
                    }
                    
                    PDF_COUNT=$(find "Back/${PDF_LOANS_DIR}/" -name "*.pdf" 2>/dev/null | wc -l)
                    echo "✅ PDF files copied: $PDF_COUNT files"
                    
                    if [ "$PDF_COUNT" -eq "0" ]; then
                        echo "⚠️ WARNING: No PDF files found in source directory"
                    fi
                else
                    echo "❌ PDF Loans directory not found at: ${LOCAL_DATA_PATH}/Back/${PDF_LOANS_DIR}"
                    echo "Creating empty directory - application will work but have no PDF data"
                    mkdir -p "Back/${PDF_LOANS_DIR}"
                fi

                # Copy Data directory - MUST exist with real data
                echo "=== Copying Data directory ==="
                if [ -d "${LOCAL_DATA_PATH}/Back/Data" ]; then
                    mkdir -p "Back/Data"
                    cp -r "${LOCAL_DATA_PATH}/Back/Data/"* "Back/Data/" 2>&1 || {
                        echo "❌ FATAL: Failed to copy Data directory"
                        exit 1
                    }
                    echo "✅ Data directory copied"
                    ls -la "Back/Data/" | head -10
                else
                    echo "❌ FATAL: Data directory not found at: ${LOCAL_DATA_PATH}/Back/Data"
                    echo "Cannot proceed without data directory"
                    exit 1
                fi

                # Copy database file - CRITICAL
                echo "=== Copying database files ==="
                if [ -f "${LOCAL_DATA_PATH}/Back/loan_analysis.db" ]; then
                    cp "${LOCAL_DATA_PATH}/Back/loan_analysis.db" "Back/"
                    echo "✅ Database file copied ($(du -h "${LOCAL_DATA_PATH}/Back/loan_analysis.db" | cut -f1))"
                else
                    echo "⚠️ No existing database - will be created during migration"
                fi

                # Copy vector database - ENTIRE DIRECTORY
                echo "=== Copying vector database ==="
                if [ -d "${LOCAL_DATA_PATH}/Back/loans_vector.db" ]; then
                    # Copy entire ChromaDB directory structure
                    cp -r "${LOCAL_DATA_PATH}/Back/loans_vector.db" "Back/"
                    echo "✅ Vector database directory copied"
                    echo "Vector DB contents:"
                    ls -la "Back/loans_vector.db/" | head -10
                elif [ -f "${LOCAL_DATA_PATH}/Back/loans_vector.db" ]; then
                    # If it's a file (shouldn't be, but handle it)
                    cp "${LOCAL_DATA_PATH}/Back/loans_vector.db" "Back/"
                    echo "✅ Vector database file copied"
                else
                    echo "⚠️ No vector database - will be created during operation"
                fi

                # Final verification - MUST HAVE DATA
                echo "=== Final workspace verification ==="
                echo "📂 Data files:"
                ls -la Back/Data/ 2>/dev/null || echo "❌ NO DATA DIRECTORY"
                echo ""
                echo "📂 PDF files:"
                ls -la "Back/PDF Loans/" 2>/dev/null | head -5 || echo "❌ NO PDF DIRECTORY"
                echo ""
                echo "📂 Database files:"
                ls -la Back/*.db 2>/dev/null || echo "ℹ️ No database files (will be created)"
                echo ""
                echo "📂 Vector DB:"
                ls -la Back/loans_vector.db/ 2>/dev/null | head -5 || echo "ℹ️ No vector DB (will be created)"
                
                # Verify essential files exist
                if [ ! -f "Back/Data/KYC.LOV.csv" ]; then
                    echo "❌ FATAL: KYC.LOV.csv not found in Data directory"
                    exit 1
                fi
                echo "✅ Essential data files verified"

                # Ensure Grafana dashboard files exist
                echo "=== Ensuring Grafana dashboards exist ==="
                mkdir -p "monitoring/grafana/provisioning/dashboards"
                
                if [ ! -f "monitoring/grafana/provisioning/dashboards/finn-compact-dashboard.json" ]; then
                    echo "Creating finn-compact-dashboard.json"
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
                    echo "Creating finn-executive-dashboard.json"
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

        stage('Deploy Application with Monitoring') {
            steps {
                sh '''
                echo "=== Deploying stack ==="

                # Deploy the stack using docker-compose
                docker compose -p ${COMPOSE_PROJECT_NAME} -f docker-compose.yml up -d \
                  ollama backend frontend \
                  prometheus alertmanager grafana

                echo "✅ App + Monitoring deployed"
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                echo "=== Health Check with retries ==="
                
                # Wait for backend to be ready (migration + server startup)
                echo "Waiting for backend to be ready..."
                MAX_RETRIES=15
                RETRY_DELAY=10
                
                for i in $(seq 1 $MAX_RETRIES); do
                    # Check if backend container is running and healthy
                    if docker compose -p ${COMPOSE_PROJECT_NAME} ps backend | grep -q "(healthy)"; then
                        echo "✅ Backend is healthy (Docker healthcheck passed)"
                        
                        # Test the actual health endpoint
                        if docker compose -p ${COMPOSE_PROJECT_NAME} exec -T backend curl -f http://localhost:8000/health; then
                            echo "✅ Backend health endpoint is responding"
                            
                            # Test data endpoints to verify data is loaded
                            echo "=== Testing data endpoints ==="
                            echo "PDF reports count:"
                            docker compose -p ${COMPOSE_PROJECT_NAME} exec -T backend curl -s http://localhost:8000/pdf-reports/ | jq '. | length' || echo "Endpoint failed"
                            echo "Loans count:"
                            docker compose -p ${COMPOSE_PROJECT_NAME} exec -T backend curl -s http://localhost:8000/loans/ | jq '. | length' || echo "Endpoint failed"
                            break
                        fi
                    else
                        echo "⏳ Backend not ready yet (attempt $i/$MAX_RETRIES)"
                        if [ $i -eq $MAX_RETRIES ]; then
                            echo "❌ Backend health check failed after $MAX_RETRIES attempts"
                            echo "=== Backend logs ==="
                            docker compose -p ${COMPOSE_PROJECT_NAME} logs backend --tail=50
                            echo "=== Container status ==="
                            docker compose -p ${COMPOSE_PROJECT_NAME} ps
                            exit 1
                        fi
                        sleep $RETRY_DELAY
                    fi
                done

                # Check monitoring services
                echo "=== Checking monitoring services ==="
                
                if docker compose -p ${COMPOSE_PROJECT_NAME} ps prometheus | grep -q "Up"; then
                    echo "✅ Prometheus container is running"
                else
                    echo "⚠️ Prometheus container not running"
                fi

                if docker compose -p ${COMPOSE_PROJECT_NAME} ps alertmanager | grep -q "Up"; then
                    echo "✅ Alertmanager container is running"
                else
                    echo "⚠️ Alertmanager container not running"
                fi

                if docker compose -p ${COMPOSE_PROJECT_NAME} ps grafana | grep -q "Up"; then
                    echo "✅ Grafana container is running"
                    sleep 15
                    if docker compose -p ${COMPOSE_PROJECT_NAME} exec -T grafana curl -f http://localhost:3000/api/health; then
                        echo "✅ Grafana health endpoint is responding"
                    fi
                else
                    echo "⚠️ Grafana container not running"
                fi
                '''
            }
        }

        stage('Verify Grafana Provisioning') {
            steps {
                sh '''
                echo "=== Verifying Grafana provisioning ==="
                sleep 20
                
                # Check datasources
                echo "Grafana datasources:"
                docker compose -p ${COMPOSE_PROJECT_NAME} exec -T grafana curl -s http://localhost:3000/api/datasources -u admin:admin | jq '.[].name' || echo "Could not fetch"
                
                # Check dashboards
                echo "Grafana dashboards:"
                docker compose -p ${COMPOSE_PROJECT_NAME} exec -T grafana curl -s http://localhost:3000/api/search -u admin:admin | jq '.[].title' || echo "Could not fetch"
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
            '''
        }
        failure {
            sh '''
            echo "=== Cleaning up due to failure ==="
            docker compose -p ${COMPOSE_PROJECT_NAME} down 2>/dev/null || true
            '''
        }
    }
}