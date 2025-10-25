#!/bin/bash
echo "=== Creating monitoring directory structure ==="

# Create monitoring directories
mkdir -p monitoring/prometheus
mkdir -p monitoring/alertmanager
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p monitoring/grafana/provisioning/dashboards

echo "=== Monitoring structure created successfully ==="
echo "Run 'docker compose -f docker-compose.monitoring.yml up -d' to start monitoring services"