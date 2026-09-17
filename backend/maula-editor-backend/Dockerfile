# =============================================================================
# Maula Editor - Cloud Sandbox - User Code Execution Environment
# =============================================================================
# This container runs user code in isolated ECS Fargate tasks
# - Node.js 20 LTS for JavaScript/TypeScript
# - Python 3.11 for Python projects
# - Common build tools (npm, yarn, pip, vite, etc.)
# =============================================================================

FROM node:20-slim

ENV APP_NAME=maula-editor

# Install Python, build tools, and common utilities
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    wget \
    unzip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create Python symlinks
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Install global Node.js tools
RUN npm install -g \
    typescript \
    ts-node \
    vite \
    @vitejs/plugin-react \
    create-vite \
    express-generator \
    nodemon \
    pm2 \
    pnpm

# Install Python packages commonly needed
RUN pip3 install --break-system-packages \
    fastapi \
    uvicorn \
    flask \
    django \
    requests \
    pandas \
    numpy

# Create sandbox user (non-root for security)
RUN useradd -m -s /bin/bash sandbox
RUN mkdir -p /app /app/workspace /app/output
RUN chown -R sandbox:sandbox /app

# Switch to sandbox user
USER sandbox
WORKDIR /app/workspace

# Copy the sandbox server
COPY --chown=sandbox:sandbox sandbox-server.js /app/sandbox-server.js

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV SANDBOX_TIMEOUT=300000

# Expose ports
# 3000 = Sandbox API
# 3001-3010 = User app ports
EXPOSE 3000 3001 3002 3003 3004 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start sandbox server
CMD ["node", "/app/sandbox-server.js"]
