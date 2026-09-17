# =============================================================================
# MAULA AI - SANDBOX CONTAINER
# =============================================================================
# This container runs in ECS Fargate for each user sandbox session.
# It provides a real Node.js environment with npm, git, and a sandbox API server.
#
# Build:   docker build -t maula-sandbox -f sandbox/Dockerfile .
# Push:    docker tag maula-sandbox:latest <ACCOUNT>.dkr.ecr.ap-southeast-1.amazonaws.com/maula-sandbox:latest
#          docker push <ACCOUNT>.dkr.ecr.ap-southeast-1.amazonaws.com/maula-sandbox:latest

FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    git \
    curl \
    wget \
    zip \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create sandbox user (non-root)
RUN groupadd -r sandbox && useradd -r -g sandbox -m -d /home/sandbox sandbox

# Create workspace directory
WORKDIR /workspace

# Copy the sandbox server
COPY sandbox-server.js /opt/sandbox/sandbox-server.js

# Set permissions
RUN chown -R sandbox:sandbox /workspace /opt/sandbox && \
    chmod +x /opt/sandbox/sandbox-server.js

# Switch to non-root user
USER sandbox

# Expose the sandbox port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:3000/__health || exit 1

# Start sandbox server
CMD ["node", "/opt/sandbox/sandbox-server.js"]
