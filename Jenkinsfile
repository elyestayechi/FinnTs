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
                    ls -la "Back/Data/" || echo "Cannot list Data directory"
                else
                    echo "⚠️ No Data directory found"
                fi

                # Copy database file if it exists
                if [ -f "${LOCAL_DATA_PATH}/Back/loan_analysis.db" ]; then
                    cp "${LOCAL_DATA_PATH}/Back/loan_analysis.db" "Back/"
                    echo "✅ Database file copied"
                    ls -lh "Back/loan_analysis.db"
                else
                    echo "⚠️ No database file found - will be created during migration"
                fi

                # Copy vector database if it exists
                if [ -f "${LOCAL_DATA_PATH}/Back/loans_vector.db" ]; then
                    cp "${LOCAL_DATA_PATH}/Back/loans_vector.db" "Back/"
                    echo "✅ Vector database file copied"
                    ls -lh "Back/loans_vector.db"
                else
                    echo "⚠️ No vector database file found"
                    # Also check for vector db directory structure
                    if [ -d "${LOCAL_DATA_PATH}/Back/loans_vector.db" ]; then
                        cp -r "${LOCAL_DATA_PATH}/Back/loans_vector.db/" "Back/loans_vector.db/"
                        echo "✅ Vector database directory copied"
                    fi
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

                echo "=== Workspace preparation complete ==="
                echo "Data directory contents:"
                ls -la "Back/Data/" || echo "Cannot list Data directory"
                echo "Database files:"
                ls -lh Back/*.db || echo "No database files found"
                '''
            }
        }

        stage('Debug Workspace') {
            steps {
                sh '''
                echo "=== Current workspace ==="
                pwd
                ls -l
                echo "=== Backend structure ==="
                ls -la Back/ || echo "Cannot list Back directory"
                echo "=== Monitoring structure ==="
                ls -l monitoring || true
                '''
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                echo "=== Building all images ==="
                
                # Build backend
                docker build -t finn-loan-analysis-backend -f Back/Dockerfile ./Back
                
                # Build frontend
                docker build -t finn-loan-analysis-frontend -f Front/Dockerfile ./Front
                
                echo "✅ All images built successfully"
                '''
            }
        }

        stage('Cleanup Previous Containers') {
            steps {
                sh '''
                echo "=== Cleaning up old containers (except Jenkins) ==="
                
                # Get Jenkins container IDs
                JENKINS_CONTAINERS=$(docker ps -q --filter "name=jenkins" 2>/dev/null || echo "")
                
                if [ -n "$JENKINS_CONTAINERS" ]; then
                    echo "Keeping Jenkins container(s):"
                    docker ps --filter "name=jenkins"
                fi

                # Stop all containers except Jenkins
                for container in $(docker ps -q); do
                    if ! echo "$JENKINS_CONTAINERS" | grep -q "$container"; then
                        echo "Stopping container: $container"
                        docker stop "$container" 2>/dev/null || true
                    fi
                done

                # Remove all stopped containers except Jenkins
                for container in $(docker ps -a -q); do
                    if ! echo "$JENKINS_CONTAINERS" | grep -q "$container"; then
                        docker rm -f "$container" 2>/dev/null || true
                    fi
                done

                # Clean up unused networks
                docker network prune -f

                echo "✅ Cleanup complete (Jenkins preserved)"
                '''
            }
        }

        stage('Deploy Application with Monitoring') {
            steps {
                sh '''
                echo "=== Deploying stack using docker-compose.local.yml ==="

                # Deploy using the local compose file (excluding Jenkins)
                docker compose -f docker-compose.local.yml up -d \
                  ollama backend frontend \
                  prometheus alertmanager grafana

                echo "✅ Application and monitoring deployed successfully"
                echo "=== Container status ==="
                docker compose -f docker-compose.local.yml ps
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                echo "=== Health Check with retries ==="
                
                # Wait for backend to be ready (migration + server startup)
                echo "Waiting for backend to be ready..."
                MAX_RETRIES=20
                RETRY_DELAY=10
                
                for i in $(seq 1 $MAX_RETRIES); do
                    echo "Attempt $i/$MAX_RETRIES..."
                    
                    # Check if backend container is running and healthy
                    if docker compose -f docker-compose.local.yml ps backend | grep -q "(healthy)"; then
                        echo "✅ Backend container is healthy"
                        
                        # Test the health endpoint
                        if docker compose -f docker-compose.local.yml exec -T backend curl -f http://localhost:8000/health 2>/dev/null; then
                            echo "✅ Backend health endpoint is responding"
                            
                            # Verify data persistence - check if data exists
                            echo "=== Verifying data persistence ==="
                            
                            echo "Checking PDF reports:"
                            PDF_COUNT=$(docker compose -f docker-compose.local.yml exec -T backend curl -s http://localhost:8000/api/pdfs 2>/dev/null | jq '. | length' 2>/dev/null || echo "0")
                            echo "PDF reports count: $PDF_COUNT"
                            
                            echo "Checking loans data:"
                            LOANS_COUNT=$(docker compose -f docker-compose.local.yml exec -T backend curl -s http://localhost:8000/api/loans 2>/dev/null | jq '. | length' 2>/dev/null || echo "0")
                            echo "Loans count: $LOANS_COUNT"
                            
                            echo "Checking KPIs endpoint:"
                            docker compose -f docker-compose.local.yml exec -T backend curl -s http://localhost:8000/api/kpis 2>/dev/null | head -c 200 || echo "KPIs check failed"
                            
                            # Verify mounted files inside container
                            echo "=== Verifying mounted files in container ==="
                            docker compose -f docker-compose.local.yml exec -T backend ls -la /app/Data/ 2>/dev/null || echo "Cannot list Data directory"
                            docker compose -f docker-compose.local.yml exec -T backend ls -lh /app/*.db 2>/dev/null || echo "Cannot list database files"
                            
                            break
                        else
                            echo "⚠️ Backend container healthy but health endpoint not responding (attempt $i/$MAX_RETRIES)"
                        fi
                    else
                        echo "⏳ Backend not ready yet (attempt $i/$MAX_RETRIES)"
                        if [ $i -eq $MAX_RETRIES ]; then
                            echo "❌ Backend health check failed after $MAX_RETRIES attempts"
                            echo "=== Backend logs ==="
                            docker compose -f docker-compose.local.yml logs backend | tail -50
                            echo "=== Container status ==="
                            docker compose -f docker-compose.local.yml ps
                            exit 1
                        fi
                        sleep $RETRY_DELAY
                    fi
                done

                # Check monitoring services
                echo "=== Checking monitoring services ==="
                
                if docker compose -f docker-compose.local.yml ps prometheus | grep -q "Up"; then
                    echo "✅ Prometheus container is running"
                else
                    echo "⚠️ Prometheus container not running"
                fi

                if docker compose -f docker-compose.local.yml ps alertmanager | grep -q "Up"; then
                    echo "✅ Alertmanager container is running"
                else
                    echo "⚠️ Alertmanager container not running"
                fi

                if docker compose -f docker-compose.local.yml ps grafana | grep -q "Up"; then
                    echo "✅ Grafana container is running"
                    
                    # Wait for Grafana to initialize
                    sleep 20
                    
                    # Check Grafana health
                    if docker compose -f docker-compose.local.yml exec -T grafana curl -f http://localhost:3000/api/health 2>/dev/null; then
                        echo "✅ Grafana health endpoint is responding"
                    else
                        echo "⚠️ Grafana container running but health endpoint not responding"
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
                sleep 15
                
                # Check datasources
                echo "Checking Grafana datasources:"
                docker compose -f docker-compose.local.yml exec -T grafana curl -s http://localhost:3000/api/datasources -u admin:admin 2>/dev/null | jq '.[].name' || echo "Could not fetch datasources"
                
                # Check dashboards
                echo "Checking Grafana dashboards:"
                docker compose -f docker-compose.local.yml exec -T grafana curl -s http://localhost:3000/api/search -u admin:admin 2>/dev/null | jq '.[].title' || echo "Could not fetch dashboards"
                
                # Check provisioning directory structure
                echo "=== Grafana provisioning file structure ==="
                docker compose -f docker-compose.local.yml exec grafana ls -la /etc/grafana/provisioning/ 2>/dev/null || echo "Cannot check Grafana provisioning"
                docker compose -f docker-compose.local.yml exec grafana ls -la /etc/grafana/provisioning/dashboards/ 2>/dev/null || echo "Cannot check dashboard files"
                
                echo "=== Service URLs (for reference) ==="
                echo "Backend:      http://localhost:8000"
                echo "Frontend:     http://localhost:3000"
                echo "Grafana:      http://localhost:3001 (admin/admin)"
                echo "Prometheus:   http://localhost:9090"
                echo "Alertmanager: http://localhost:9093"
                '''
            }
        }
    }

    post {
        success {
            sh '''
            echo ""
            echo "🎉 =========================================="
            echo "🎉   DEPLOYMENT SUCCESSFUL!                "
            echo "🎉 =========================================="
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
            echo "1. Open: http://localhost:3001"
            echo "2. Login: admin/admin"
            echo "3. Navigate: Dashboards → Browse"
            echo "4. Available: Finn Compact Dashboard & Executive Dashboard"
            echo ""
            echo "Note: Dashboards may take 1-2 minutes to fully provision"
            echo ""
            echo "=== DATA VERIFICATION ==="
            echo "All data from previous deployment should be preserved:"
            echo "  - PDF reports"
            echo "  - Loan analyses"
            echo "  - KPIs and metrics"
            echo "  - Vector database"
            echo ""
            echo "Using docker-compose.local.yml ensures consistent configuration!"
            echo ""
            '''
        }
        failure {
            sh '''
            echo ""
            echo "❌ =========================================="
            echo "❌   DEPLOYMENT FAILED                     "
            echo "❌ =========================================="
            echo ""
            echo "Collecting diagnostic information..."
            echo ""
            echo "=== Container Status ==="
            docker compose -f docker-compose.local.yml ps || true
            echo ""
            echo "=== Recent Backend Logs ==="
            docker compose -f docker-compose.local.yml logs --tail=100 backend || true
            echo ""
            echo "Cleaning up failed deployment..."
            docker compose -f docker-compose.local.yml down 2>/dev/null || true
            '''
        }
        always {
            sh '''
            echo ""
            echo "=== Final Container Status ==="
            docker compose -f docker-compose.local.yml ps || true
            '''
        }
    }
}