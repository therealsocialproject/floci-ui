# Floci Web UI (`floci-ui`)

> A modern, responsive Web Management Console and Dashboard for the **Floci Cloud Emulator** (LocalStack compatible).

---

## 🌟 Key Features

* 🚀 **Universal Service Overview**: Real-time operational health and status badges for all 80+ emulated AWS services (EC2, S3, IAM, DynamoDB, KMS, Lambda, RDS, and more).
* 🖥️ **EC2 Compute Manager**:
  * View active and stopped simulated virtual machines.
  * Inspect IP addresses, security groups, instance profiles, and custom tags.
  * Interactive controls to Start, Stop, and Terminate instances.
* 📦 **S3 Storage Explorer**:
  * Bucket list and storage inspector.
  * Object explorer showing keys, file sizes, last modified timestamps, and storage tiers.
* 👥 **IAM Access & Permissions**:
  * Inspect IAM Roles, Users, Groups, and Managed Policies.
  * Policy attachment counts and ARN details.
* 🗄️ **DynamoDB Explorer**:
  * Browse NoSQL tables, primary key schemas, and scanned items rendered in JSON.
* ⚡ **Live Endpoint Switcher**:
  * Switch between `http://localhost:4566`, remote sandboxes (e.g. `http://10.110.110.151:4566`), or custom endpoints directly from the navbar.

---

## 🚀 Quick Start

### 1. Prerequisites
* Node.js v18+ or Docker.
* A running Floci emulator instance (default: `http://localhost:4566`).

### 2. Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/floci-ui.git
cd floci-ui

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker Deployment

### Run Standalone
```bash
docker build -t floci-ui .
docker run -d -p 3000:3000 -e FLOCI_ENDPOINT="http://10.110.110.151:4566" floci-ui
```

### Run with Docker Compose (Floci + UI)
```bash
docker-compose up -d
```

---

## ⚙️ Environment Configuration

| Variable | Default | Description |
| :--- | :--- | :--- |
| `FLOCI_ENDPOINT` | `http://localhost:4566` | Target Floci / LocalStack endpoint address |
| `PORT` | `3000` | HTTP listening port |

---

## 📄 License
MIT
