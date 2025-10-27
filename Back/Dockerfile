FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directories with proper permissions
RUN mkdir -p /app/data /app/PDF\ Loans /app/db_storage && \
    chmod -R 755 /app/data /app/PDF\ Loans /app/db_storage

# Expose port
EXPOSE 8000

# Health check - more lenient for slower startups
HEALTHCHECK --interval=30s --timeout=30s --start-period=120s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

# Set environment variables
ENV PYTHONPATH=/app
ENV DATA_DIR=/app/data
ENV PYTHONUNBUFFERED=1

# Simple startup command with proper data migration
CMD ["sh", "-c", "python migrate_data.py && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2"]