FROM prom/alertmanager:latest

# Copy Alertmanager config
COPY config.yml /etc/alertmanager/config.yml

EXPOSE 9093
CMD ["--config.file=/etc/alertmanager/config.yml", "--storage.path=/alertmanager"]
