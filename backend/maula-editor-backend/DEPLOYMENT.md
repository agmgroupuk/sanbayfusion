# Cloud Sandbox Infrastructure - AWS ECS Deployment Guide

## Overview

The Cloud Sandbox provides a real server execution environment for user code, enabling:
- Real `npm install` and package management
- Full build pipelines (Vite, Webpack, etc.)
- Backend code execution (Node.js, Python)
- Custom subdomains for deployed apps
- WebSocket-based real-time output streaming

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │  canvas-studio  │  │  maula-editor   │  │  gen-craft-pro  │   │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
└───────────┼────────────────────┼────────────────────┼────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API Server                          │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │                  /api/sandbox/*                          │     │
│  │  - POST /start       (create ECS task)                   │     │
│  │  - POST /:id/stop    (stop ECS task)                     │     │
│  │  - GET  /:id/status  (check task status)                 │     │
│  │  - ALL  /:id/proxy/* (proxy to sandbox)                  │     │
│  │  - POST /:id/deploy  (deploy to S3/CloudFront)           │     │
│  └────────┬────────────────────────────────────────────────┘     │
└───────────┼──────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Cloud                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  ECS Fargate │  │     ALB      │  │   S3 + CloudFront    │   │
│  │   Cluster    │◄─┤  (routing)   │  │   (static hosting)   │   │
│  │              │  └──────────────┘  └──────────────────────┘   │
│  │ ┌──────────┐ │                                               │
│  │ │ Sandbox  │ │  ┌──────────────┐  ┌──────────────────────┐   │
│  │ │Container │ │  │   DynamoDB   │  │        ECR           │   │
│  │ │          │ │  │  (sessions)  │  │  (container images)  │   │
│  │ └──────────┘ │  └──────────────┘  └──────────────────────┘   │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Steps

### 1. Prerequisites

- AWS CLI configured with appropriate permissions
- Docker installed locally
- Node.js 18+ for backend

### 2. Deploy CloudFormation Stack

```bash
cd backend/maula-editor

# Deploy the infrastructure stack
aws cloudformation create-stack \
  --stack-name maula-editor-sandbox \
  --template-body file://aws-infrastructure.yaml \
  --capabilities CAPABILITY_IAM \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=VpcId,ParameterValue=vpc-xxxxx \
    ParameterKey=SubnetIds,ParameterValue="subnet-xxx,subnet-yyy" \
    ParameterKey=DomainName,ParameterValue=maula.sandbox.onelastai.co

# Wait for stack to complete
aws cloudformation wait stack-create-complete --stack-name maula-editor-sandbox

# Get outputs
aws cloudformation describe-stacks --stack-name maula-editor-sandbox \
  --query 'Stacks[0].Outputs' --output table
```

### 3. Build and Push Docker Image

```bash
cd backend/maula-editor

# Get ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# Build the image
docker build -t maula-editor-sandbox .

# Tag and push
docker tag maula-editor-sandbox:latest <account>.dkr.ecr.us-east-1.amazonaws.com/maula-editor-sandbox:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/maula-editor-sandbox:latest
```

### 4. Register ECS Task Definition

```bash
# Create task definition (update values from CloudFormation outputs)
aws ecs register-task-definition \
  --family maula-editor-sandbox \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 512 \
  --memory 1024 \
  --execution-role-arn <execution-role-arn> \
  --task-role-arn <task-role-arn> \
  --container-definitions '[
    {
      "name": "sandbox",
      "image": "<account>.dkr.ecr.us-east-1.amazonaws.com/maula-editor-sandbox:latest",
      "portMappings": [
        {"containerPort": 3000, "protocol": "tcp"},
        {"containerPort": 3001, "protocol": "tcp"},
        {"containerPort": 3002, "protocol": "tcp"}
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/maula-editor-sandbox",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "sandbox"
        }
      }
    }
  ]'
```

### 5. Update Environment Variables

Add the CloudFormation outputs to `backend/.env`:

```env
# ===== CLOUD SANDBOX (AWS ECS) =====
SANDBOX_ECS_CLUSTER=Al-Habibi
SANDBOX_TASK_DEFINITION=arn:aws:ecs:ap-southeast-1:863394984321:task-definition/habibiai-sandbox:1
SANDBOX_SECURITY_GROUP=sg-0967765fef8cd1b2d
SANDBOX_SUBNETS=subnet-0198823fddf3fe34e,subnet-08ea233b8ee51f91c
SANDBOX_ALB_ARN=arn:aws:elasticloadbalancing:ap-southeast-1:863394984321:loadbalancer/app/habibiai-sandbox-alb/b3f277362175b199
SANDBOX_LISTENER_ARN=arn:aws:elasticloadbalancing:ap-southeast-1:863394984321:listener/app/habibiai-sandbox-alb/b3f277362175b199/8539e9238063d10d
SANDBOX_TARGET_GROUP_ARN=arn:aws:elasticloadbalancing:ap-southeast-1:863394984321:targetgroup/habibiai-sandbox-targets/edf0e928aa4e1bd7
SANDBOX_VPC_ID=vpc-067a8acf888ad1baa
SANDBOX_S3_BUCKET=habibiai-hosted-apps
SANDBOX_SESSIONS_TABLE=habibiai-sandbox-sessions
SANDBOX_DOMAIN=sandbox.onelastai.co
SANDBOX_ALB_DNS=habibiai-sandbox-alb-1249259035.ap-southeast-1.elb.amazonaws.com

# AWS Credentials (use IAM role if on EC2)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=AKIA4SBSZ6GAZLIWD3P2
AWS_SECRET_ACCESS_KEY=xxx
```

### Deployed Resources (February 11, 2026)

| Resource | Value |
|----------|-------|
| **ECS Cluster** | Al-Habibi |
| **ECR Repository** | onelastai-sandbox |
| **ECR Image** | `863394984321.dkr.ecr.ap-southeast-1.amazonaws.com/onelastai-sandbox:latest` |
| **VPC** | vpc-067a8acf888ad1baa (habibiai-vpc, CIDR 172.31.0.0/16) |
| **Subnets** | subnet-0198823fddf3fe34e (ap-southeast-1a), subnet-08ea233b8ee51f91c (ap-southeast-1b) |
| **Security Group** | sg-0967765fef8cd1b2d (habibi-ai-sg, ports 80 + 3000 inbound) |
| **ALB** | habibiai-sandbox-alb |
| **ALB DNS** | `habibiai-sandbox-alb-1249259035.ap-southeast-1.elb.amazonaws.com` |
| **Target Group** | habibiai-sandbox-targets (port 3000, IP target type) |
| **S3 Bucket** | habibiai-hosted-apps |
| **DynamoDB Table** | habibiai-sandbox-sessions (PAY_PER_REQUEST) |
| **Cloud Map Namespace** | ns-bsa4q4ag37igfkhb (Habibi-Namespace) |
| **Cloud Map Service** | srv-vps3445usrhmqr7b (Habibi-service) |

### 6. Setup DNS (Route 53)

Create wildcard record for sandbox subdomains:

```bash
# Create hosted zone if needed
aws route53 create-hosted-zone --name sandbox.onelastai.co --caller-reference $(date +%s)

# Add wildcard A record pointing to ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "*.sandbox.onelastai.co",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "<alb-zone-id>",
          "DNSName": "<alb-dns-name>",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

## Usage

### Frontend Integration

The sandbox service is available in both canvas-studio and maula-editor:

```typescript
import { sandboxService } from './services/sandboxService';

// Start a new sandbox session
const session = await sandboxService.startSession();

// Wait for container to be ready
await sandboxService.waitForReady();

// Sync project files
await sandboxService.initProject([
  { path: 'package.json', content: '...' },
  { path: 'src/App.tsx', content: '...' },
]);

// Install dependencies
await sandboxService.installPackages();

// Start dev server
const result = await sandboxService.startDevServer();
// result.url = "https://<session-id>.sandbox.onelastai.co"

// Subscribe to output
sandboxService.onOutput((type, data) => {
  console.log(`[${type}] ${data}`);
});

// Deploy to production
const deployment = await sandboxService.deploy();
// deployment.url = "https://<project>.apps.onelastai.co"

// Stop when done
await sandboxService.stopSession();
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sandbox/start` | Start new sandbox session |
| POST | `/api/sandbox/:id/stop` | Stop sandbox session |
| GET | `/api/sandbox/:id/status` | Get session status |
| GET | `/api/sandbox/sessions` | List user's sessions |
| POST | `/api/sandbox/:id/deploy` | Deploy to static hosting |
| ALL | `/api/sandbox/:id/proxy/*` | Proxy requests to sandbox |

### Sandbox Container Endpoints

These are proxied through the backend:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/init` | Initialize project files |
| POST | `/write` | Write single file |
| GET | `/read` | Read file content |
| GET | `/list` | List directory |
| POST | `/exec` | Execute command |
| POST | `/install` | Install npm packages |
| POST | `/build` | Run build command |
| POST | `/dev` | Start dev server |
| POST | `/stop` | Stop dev server |
| GET | `/output` | Get process output |
| WS | `/ws` | Real-time output stream |

## Limits & Quotas

- Max sessions per user: 3 concurrent
- Session timeout: 30 minutes of inactivity
- Container resources: 512 CPU units, 1GB memory
- Storage: 10GB ephemeral storage per container
- Preview ports: 3001-3010 available

## Cost Estimation

| Resource | Estimated Cost |
|----------|----------------|
| ECS Fargate (512 CPU, 1GB) | ~$0.02/hour per container |
| ALB | ~$0.0225/hour + $0.008/LCU-hour |
| S3 | ~$0.023/GB storage |
| CloudFront | ~$0.085/GB transfer |
| DynamoDB | On-demand pricing, minimal |

For 100 users with average 2 hours/day usage:
- ECS: ~$120/month
- ALB: ~$20/month
- S3/CloudFront: ~$50/month (depending on deployments)
- **Total: ~$200/month**

## Troubleshooting

### Container won't start
1. Check ECS logs in CloudWatch
2. Verify security group allows egress
3. Ensure task definition has correct IAM roles

### Preview not loading
1. Check ALB target group health
2. Verify security group allows port 3001-3010
3. Check sandbox container logs

### Deploy fails
1. Verify S3 bucket permissions
2. Check CloudFront invalidation
3. Ensure build completes successfully

## Security Considerations

- Containers run as non-root user (`sandbox`)
- Each session gets isolated container
- Network isolation via VPC
- Session tokens validated on all requests
- Auto-cleanup after timeout
- Rate limiting on API endpoints
