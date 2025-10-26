FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    sqlite3 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directories with proper permissions
RUN mkdir -p /app/Data /app/PDF\ Loans /app/db_storage && \
    chmod -R 755 /app/Data /app/PDF\ Loans /app/db_storage

# Expose port
EXPOSE 8000

# Health check - more lenient for slower startups
HEALTHCHECK --interval=30s --timeout=30s --start-period=120s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

# Set environment variables
ENV PYTHONPATH=/app
ENV DATA_DIR=/app/Data
ENV PYTHONUNBUFFERED=1

# Startup script with better error handling
CMD ["sh", "-c", "\
    echo '========================================' && \
    echo '   Starting Finn Backend Service' && \
    echo '========================================' && \
    echo '' && \
    echo '📂 Checking data directories...' && \
    ls -lah /app/Data 2>/dev/null | head -10 || echo '⚠️  Data directory empty' && \
    echo '' && \
    ls -lah /app/PDF\\ Loans 2>/dev/null | head -10 || echo '⚠️  PDF Loans directory empty' && \
    echo '' && \
    echo '🔄 Running data migration...' && \
    python migrate_data.py || echo '⚠️  Migration script encountered issues' && \
    echo '' && \
    echo '🚀 Starting Uvicorn server...' && \
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2 --log-level info\
"]