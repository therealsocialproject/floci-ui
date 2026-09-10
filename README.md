# Floci Web UI (`floci-ui`)

> A modern, multi-cloud Web Management Console and Dashboard for the **Floci Cloud Emulator** (supporting both AWS & Google Cloud APIs).

---

## 🌟 Key Features

* ☁️ **Dual Cloud Provider Views (AWS vs. Google Cloud)**:
  * **AWS Console Mode**: Styled with AWS Console dark navy (`#232f3e`), signature AWS orange accents (`#ff9900`), region indicator (`us-east-1`), and standard AWS naming (*EC2, S3, IAM, DynamoDB*).
  * **GCP Console Mode**: Styled with Google Cloud Blue accents (`#1a73e8`), Project selector (`mock-project`), and GCP naming (*Compute Engine, Cloud Storage, IAM & Admin, Datastore*).
  * Toggle between both views seamlessly with 1-click in the header.

* 🌐 **Zero Hardcoding & Custom Environment Manager**:
  * Default out-of-the-box target: `http://localhost:4566`.
  * Add, name, edit, and delete custom emulator endpoints (e.g. `http://staging-vm:4566`, `http://qa-cluster:4566`) right inside the UI, persisted in browser storage.

* 🖥️ **Compute & VM Manager**:
  * View active and stopped simulated virtual machines / container instances.
  * Inspect IP addresses, security groups/firewall tags, instance profiles/service accounts, and workload tags.
  * Interactive controls to **Start**, **Stop**, and **Terminate** instances.

* 📦 **Storage Explorer**:
  * Browse S3 / GCS buckets and stored objects.
  * Inspect keys, human-readable file sizes, last modified timestamps, and storage tiers.

* 👥 **Identity & Access (IAM)**:
  * Inspect Roles, Service Accounts, Users, Groups, and Managed Policies.
  * Policy attachment counters and ARN details.

* 🗄️ **NoSQL Database Explorer**:
  * Browse DynamoDB tables / Datastore kinds.
  * Inspect key schemas and scanned records formatted in syntax-highlighted JSON.

* 🚀 **Universal Service Health Check**:
  * Live status grid reporting all 80+ emulated cloud services (`ec2`, `s3`, `iam`, `lambda`, `kms`, `dynamodb`, `rds`, `sqs`, `sns`, etc.) directly from `/_localstack/health`.

---

## 🐳 Quick Start with Docker

Pull and run the prebuilt standalone container:

```bash
# Run against a local Floci instance on host port 4566
docker run -d \
  --name floci-ui \
  -p 3000:3000 \
  -e FLOCI_ENDPOINT="http://host.docker.internal:4566" \
  ghcr.io/your-org/floci-ui:latest
```

Or build and run locally:
```bash
docker build -t floci-ui .
docker run -d -p 3000:3000 floci-ui
```

### Run with Docker Compose (Floci + Floci-UI together)
```bash
docker compose up -d
```
Visit [http://localhost:3000](http://localhost:3000).

---

## 💻 Local Development

### 1. Prerequisites
* Node.js v18+ and npm.
* A running Floci instance (`http://localhost:4566` or any reachable IP).

### 2. Setup
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

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `FLOCI_ENDPOINT` | `http://localhost:4566` | Default Floci emulator URL |
| `PORT` | `3000` | Web server listening port |

---

## 📄 License
MIT License
