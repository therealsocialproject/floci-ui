# Floci Web UI (`floci-ui`)

[![Release](https://img.shields.io/badge/version-v1.4.0-blue.svg)](https://github.com/therealsocialproject/floci-ui/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Container Image](https://img.shields.io/badge/ghcr.io-therealsocialproject%2Ffloci--ui-blue?logo=docker)](https://github.com/therealsocialproject/floci-ui/pkgs/container/floci-ui)

> A modern, responsive multi-cloud Web Management Console and Dashboard for the **Floci Cloud Emulator** (supporting both AWS & Google Cloud Console experiences).

---

## About Floci

[Floci](https://github.com/floci-io/floci) is a lightweight, high-performance open-source cloud emulator built on Quarkus Native and GraalVM. It delivers ultra-fast, credential-free local cloud service emulation across AWS, Google Cloud, Azure, and OCI—serving as an efficient drop-in alternative for local development and CI/CD testing.

**Floci Web UI** (`floci-ui`) provides a unified, visual management console for your Floci instances. It offers dual AWS and Google Cloud console themes, comprehensive resource explorers, live management capabilities (create, upload, invoke, test, and delete), and real-time observability across 11 core emulated cloud services.

Learn more about Floci at [floci.io](https://floci.io) or explore the [Floci GitHub organization](https://github.com/floci-io).

---

## Previews

### AWS Management Console View
<img width="1728" alt="AWS Console View" src="https://github.com/user-attachments/assets/21c5c0be-40e7-4131-a531-5be52412eab9" />

### Google Cloud Console View
<img width="1728" alt="Google Cloud Console View" src="https://github.com/user-attachments/assets/2c18ffed-ba79-4840-af0f-94646851c185" />

---

## Supported Services & Core Features

### 1. Dual Cloud Provider Experiences (AWS vs. Google Cloud)
* **AWS Console Mode**: Styled with AWS Console dark navy (`#232f3e`), signature AWS orange accents (`#ff9900`), region indicator (`us-east-1`), and standard AWS naming (*EC2, S3, IAM, DynamoDB, RDS, API Gateway, SQS, Lambda, CloudWatch, KMS, Secrets Manager*).
* **GCP Console Mode**: Styled with Google Cloud Blue accents (`#1a73e8`), Project selector (`mock-project`), and GCP naming (*Compute Engine, Cloud Storage, IAM & Admin, Datastore, Cloud SQL, Endpoints, Pub/Sub, Cloud Functions, Cloud Logging, Cloud KMS, Secret Manager*).
* Toggle between both views seamlessly with 1-click in the header on any environment.

### 2. Multi-Environment & Endpoint Manager
* **Zero Hardcoding**: Switch between local, dev, staging, or remote Floci endpoints instantly.
* Add, label, edit, probe health, and delete custom emulator endpoints (e.g. `http://staging-vm:4566`, `http://10.75.75.50:4566`) right inside the UI, persisted in browser storage.

### 3. Compute Engine & Virtual Machines (`/ec2`)
* View active, stopped, and pending virtual machines / container instances.
* Inspect IP addresses, security groups, instance profiles, and tags.
* Interactive controls to **Launch**, **Start**, **Stop**, and **Terminate** instances.

### 4. Serverless Functions (`/lambda`)
* Inspect deployed serverless functions, runtimes (Node.js, Python, Go, Java), memory allocations, and handlers.
* **Interactive Function Invoker**: Test execute functions directly from the console with custom JSON events and view real-time execution payloads and logs.
* Delete functions with a single click.

### 5. API Gateway & Interactive Explorer (`/apigateway`)
* **Unified REST (v1) & HTTP (v2) Support**: Manage all emulated REST and HTTP/WebSocket APIs.
* **In-Console API Request Tester**: Send test requests with customizable HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`), custom stages (e.g. `_user_request_`, `dev`, `prod`), headers, and JSON body payloads.
* **Live Response Telemetry**: Real-time status code badges, request latency in milliseconds, response headers, and formatted JSON output.
* **Route & Resource Tree Viewer**: Inspect configured paths, URL resources, and method integrations.

### 6. Relational Database Service (`/rds`)
* **Multi-Tab Database Console**: Dedicated views for **DB Instances**, **Clusters (Aurora & DocumentDB)**, and **Snapshots**.
* **Instance Management**: View database identifiers, engines (PostgreSQL, MySQL, MariaDB, Aurora), status badges, storage, and endpoint URLs (`host:port`) with 1-click copy.
* **Database Operations**: Create database instances, trigger instance reboots, take immediate snapshots, and safely delete instances.

### 7. Object Storage (`/s3`)
* Browse S3 / GCS buckets and stored objects.
* Inspect keys, human-readable file sizes, last modified timestamps, and storage tiers.
* **Create and delete buckets**, plus **upload and delete objects** (file or text payload).

### 8. NoSQL Database (`/dynamodb`)
* Browse DynamoDB tables / Datastore kinds.
* Inspect key schemas and scanned records formatted in syntax-highlighted JSON.
* **Create and delete tables** with custom partition and sort key configurations.
* **Insert JSON items** and **delete individual records** directly from the UI.

### 9. Notification Service & Pub/Sub (`/sns`)
* **Topic Management**: Create Standard or FIFO topics, view topic ARNs, and manage topic attributes.
* **Subscriptions**: Subscribe endpoints (SQS queues, Lambda functions, Email addresses, HTTP/S webhooks) directly to topics.
* **Interactive Message Publisher**: Dispatch test messages with custom subjects, JSON payloads, and FIFO group/deduplication IDs.

### 10. Systems Manager Parameter Store (`/ssm`)
* **Hierarchical Parameter Storage**: Manage parameters organized in path hierarchies (`/app/environment/key`).
* **Multi-Type Support**: Seamlessly create and edit `String`, `StringList`, and encrypted `SecureString` parameters.
* **Security & Transparency**: Mask/reveal secret parameter values on demand, 1-click clipboard copying, and inspect full version histories (`v1`, `v2`, etc.).

### 11. Message Queues (`/sqs`)
* Browse standard and FIFO message queues, queue URLs, and approximate message counters.
* **Queue Operations**: Create standard or FIFO queues, purge queues, and delete queues.
* **Message Testing**: Send messages with custom delay seconds and message bodies directly from the console.

### 12. Observability & Log Groups (`/logs`)
* Browse CloudWatch Log Groups, retention policies, and stored byte counts.
* **Stream & Event Explorer**: Inspect log streams and drill down into individual log events with search filters and timestamps.
* Create and delete log groups.

### 13. Security & Identity (`/iam`)
* Inspect Roles, Service Accounts, Users, Groups, and Managed Policies.
* **User Security Credentials Management**:
  * Set, update, or remove console login passwords using Floci's `CreateLoginProfile` and `ChangePassword` APIs.
  * Generate and manage programmatic Access Keys (`AccessKeyId` + `SecretAccessKey`) with 1-click clipboard copy.
  * Conflict-free user deletion with automated cascade cleanup of login profiles and access keys.
* **Role & Policy Management**: Create and delete Roles with custom trust policies, Users, Groups, and Policies.

### 14. Secrets Manager (`/secrets`)
* Browse stored application secrets, secret types, and ARNs.
* **Secret Values**: Securely view and toggle visibility for secret strings (plaintext or JSON).
* Create and delete secrets.

### 15. Key Management Service (`/kms`)
* Browse Customer Managed Keys and AWS Managed Keys, aliases, key states (`Enabled`/`Disabled`), and key specs.
* **Key Lifecycle Operations**: Create symmetric encryption keys, toggle key enabled/disabled status, and inspect key ARNs.

### 16. Universal Resource Drawer (`ResourceDrawer`)
* Consistent slide-out drawer accessible on every resource across all services.
* Multiple view modes: **JSON Tree**, **Formatted Properties Table**, and **Raw Text** with one-click clipboard copying.

---

## Quick Start with Docker

Pull and run the prebuilt multi-architecture container from GitHub Packages:

```bash
# Run against a local Floci instance on host port 4566
docker run -d \
  --name floci-ui \
  -p 3000:3000 \
  -e FLOCI_ENDPOINT="http://host.docker.internal:4566" \
  ghcr.io/therealsocialproject/floci-ui:latest
```

Or build and run locally:
```bash
docker build -t floci-ui .
docker run -d -p 3000:3000 -e FLOCI_ENDPOINT="http://host.docker.internal:4566" floci-ui
```

### Run with Docker Compose (Floci + Floci UI)
```bash
docker compose up -d
```
Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Local Development

### 1. Prerequisites
* Node.js v18+ and npm.
* A running Floci emulator (`http://localhost:4566` or any reachable network IP).

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/therealsocialproject/floci-ui.git
cd floci-ui

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `FLOCI_ENDPOINT` | `http://10.75.75.50:4566` | Default Floci backend emulator URL used on initial load |
| `PORT` | `3000` | Web server listening port |

---

## License
MIT License. Created and maintained for the Floci Community by [The Real Social Project](https://github.com/therealsocialproject).
