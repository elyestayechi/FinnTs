FROM grafana/grafana:latest

# Create provisioning directories
RUN mkdir -p /etc/grafana/provisioning/datasources \
             /etc/grafana/provisioning/dashboards

# Copy datasource configuration
COPY provisioning/datasources/datasource.yml /etc/grafana/provisioning/datasources/

# Copy dashboard configuration
COPY provisioning/dashboards/dashboards.yml /etc/grafana/provisioning/dashboards/

# Copy dashboard JSON files
COPY provisioning/dashboards/*.json /etc/grafana/provisioning/dashboards/

USER root
RUN chown -R 472:472 /etc/grafana/provisioning
USER 472

# Expose port
EXPOSE 3000

# Default command
CMD ["grafana-server", "--config", "/etc/grafana/grafana.ini", "--homepath", "/usr/share/grafana"]