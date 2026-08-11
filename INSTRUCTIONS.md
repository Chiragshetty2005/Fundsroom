# Mini ERP + CRM: Docker & AWS Free Hosting Guide

This guide provides step-by-step instructions for:
1. **Running the complete application locally using Docker & Docker Compose**
2. **Hosting the application 100% for FREE on AWS (EC2 Free Tier)**

---

# Table of Contents
- [Part 1: Local Docker Setup & Usage](#part-1-local-docker-setup--usage)
  - [1. Architecture Overview](#1-architecture-overview)
  - [2. Prerequisites](#2-prerequisites)
  - [3. Step-by-Step Local Setup](#3-step-by-step-local-setup)
  - [4. Docker Command Cheat Sheet](#4-docker-command-cheat-sheet)
  - [5. Troubleshooting Common Docker Issues](#5-troubleshooting-common-docker-issues)
- [Part 2: Free Hosting on AWS (Step-by-Step)](#part-2-free-hosting-on-aws-step-by-step)
  - [1. AWS Free Tier Overview](#1-aws-free-tier-overview)
  - [2. Step 1: Launch an EC2 Instance](#step-1-launch-an-ec2-instance)
  - [3. Step 2: Configure Security Group (Firewall)](#step-2-configure-security-group-firewall)
  - [4. Step 3: Connect to your EC2 Instance](#step-3-connect-to-your-ec2-instance)
  - [5. Step 4: Install Docker & Docker Compose on EC2](#step-4-install-docker--docker-compose-on-ec2)
  - [6. Step 5: Clone Project & Configure Environment](#step-5-clone-project--configure-environment)
  - [7. Step 6: Start Containers, Migrate & Seed](#step-6-start-containers-migrate--seed)
  - [8. Step 7: (Optional) Free Domain & SSL with HTTPS](#step-7-optional-free-domain--ssl-with-https)
  - [9. Step 8: Keep it Free (Best Practices)](#step-8-keep-it-free-best-practices)

---

# Part 1: Local Docker Setup & Usage

## 1. Architecture Overview

The multi-container architecture is orchestrated via `docker-compose.yml`:

```
               ┌────────────────────────────────────────────────────────┐
               │                     User Browser                       │
               └───────────┬────────────────────────────────┬───────────┘
                           │ Port 5173                      │ Port 3000
                           ▼                                ▼
               ┌───────────────────────┐        ┌───────────────────────┐
               │    Web Container      │        │     API Container     │
               │ (Nginx + React SPA)   │───────▶│ (Node 20 + Express 5) │
               │   `mini_erp_web`      │        │    `mini_erp_api`     │
               └───────────────────────┘        └───────────┬───────────┘
                                                            │ Internal Port 5432
                                                            ▼
                                                ┌───────────────────────┐
                                                │   Postgres Database   │
                                                │ (PostgreSQL 16 Alpine)│
                                                │  `mini_erp_postgres`  │
                                                └───────────┬───────────┘
                                                            │
                                                            ▼
                                                ┌───────────────────────┐
                                                │ Named Volume `pgdata` │
                                                │ (Data Persistence)    │
                                                └───────────────────────┘
```

- **`postgres`**: Official `postgres:16-alpine` database with health checks (`pg_isready`) and volume persistence.
- **`api`**: Multi-stage Node 20 container that builds TypeScript, generates Prisma Client, and runs the Express REST API.
- **`web`**: Multi-stage container that compiles the React 19 Vite application and serves production assets through Nginx with SPA routing fallback.

---

## 2. Prerequisites

Make sure you have installed on your local machine:
- **Docker Desktop** (or Docker Engine + Docker Compose Plugin)
  - Verify installation:
    ```bash
    docker --version
    docker compose version
    ```

---

## 3. Step-by-Step Local Setup

### Step 3.1: Configure Environment Variables

Copy the example environment configuration into `.env`:

```bash
cp .env.example .env
```

Your `.env` file contains default settings ready for immediate local use:
```env
NODE_ENV=development
PORT=3000
CLIENT_ORIGIN=http://localhost:5173

DB_HOST=postgres
DB_PORT=5432
DB_NAME=mini_erp
DB_USER=mini_erp_app
DB_PASSWORD=postgres123
DB_SCHEMA=public

JWT_SECRET=my-super-secret-jwt-key-for-dev-1234
JWT_EXPIRES_IN=8h
SEED_USER_PASSWORD=localTestPass123
```

---

### Step 3.2: Build and Start All Containers

Run the following command to build images and start all services in the background:

```bash
# Option A: Using npm script
npm run docker:up

# Option B: Using make
make up

# Option C: Using Docker Compose directly
docker compose up -d --build
```

---

### Step 3.3: Run Database Migrations

Once the containers are running and the database is healthy, apply the database migrations:

```bash
# Option A: Using npm script
npm run docker:migrate

# Option B: Using make
make migrate

# Option C: Using Docker Compose directly
docker compose exec api npm run prisma:deploy
```

---

### Step 3.4: Seed Initial Data & Demo Users

Populate the database with pre-configured demo users across all roles:

```bash
# Option A: Using npm script
npm run docker:seed

# Option B: Using make
make seed

# Option C: Using Docker Compose directly
docker compose exec api npm run db:seed
```

---

### Step 3.5: Access the Application

Open your browser and navigate to:
- **Web Frontend**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:3000/api](http://localhost:3000/api)
- **API Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

#### Pre-Configured Demo Logins (Password: `localTestPass123`)
- **Admin**: `admin@minierp.local` (Full access + User Role Admin)
- **Sales**: `sales@minierp.local` (CRM & Sales Challans)
- **Warehouse**: `warehouse@minierp.local` (Products & Stock Adjustments)
- **Accounts**: `accounts@minierp.local` (Read-only audit view)
- **User**: `user@minierp.local` (Standard role)

*(You can also use the 1-click test buttons on the login page!)*

---

## 4. Docker Command Cheat Sheet

| Task | npm Shortcut | Make Shortcut | Docker Command |
| :--- | :--- | :--- | :--- |
| **Start / Build** | `npm run docker:up` | `make up` | `docker compose up -d --build` |
| **Stop Containers** | `npm run docker:down` | `make down` | `docker compose down` |
| **View All Logs** | `npm run docker:logs` | `make logs` | `docker compose logs -f` |
| **View API Logs** | `npm run docker:logs:api` | `make logs-api` | `docker compose logs -f api` |
| **View Web Logs** | `npm run docker:logs:web` | `make logs-web` | `docker compose logs -f web` |
| **Run Migrations** | `npm run docker:migrate` | `make migrate` | `docker compose exec api npm run prisma:deploy` |
| **Run Seed** | `npm run docker:seed` | `make seed` | `docker compose exec api npm run db:seed` |
| **Open API Shell** | — | — | `docker compose exec api sh` |
| **Open DB Shell** | — | — | `docker compose exec postgres psql -U mini_erp_app -d mini_erp` |
| **Clean Reset** | — | — | `docker compose down -v && docker compose up -d --build` |

---

## 5. Troubleshooting Common Docker Issues

### Port Conflict (e.g., port 5432 or 3000 already in use)
If you have a local PostgreSQL or Node server already running on your host:
```bash
# Stop local postgres on Linux/Ubuntu:
sudo systemctl stop postgresql
```
Or change the host port in `.env` (e.g. `DB_PORT=5433`).

### Reset Database Volume
To completely wipe and recreate the database:
```bash
docker compose down -v
docker compose up -d
npm run docker:migrate
npm run docker:seed
```

---

# Part 2: Free Hosting on AWS (Step-by-Step)

You can host this full-stack application on **AWS completely for free** using the **AWS Free Tier**.

---

## 1. AWS Free Tier Overview

Amazon Web Services (AWS) provides a generous **12 Months Free Tier** for new accounts:
- **EC2 Compute**: 750 hours/month of `t2.micro` (or `t3.micro` in eligible regions) — sufficient to run 1 instance 24/7.
- **EBS Storage**: 30 GB of General Purpose SSD (gp2/gp3) storage.
- **Bandwidth**: 100 GB of free data transfer out per month.

---

## Step 1: Launch an EC2 Instance

1. Log in to the [AWS Management Console](https://aws.amazon.com/console/).
2. In the top search bar, type **EC2** and click **EC2**.
3. In the EC2 Dashboard, click **Launch Instance**.
4. Fill in the instance details:
   - **Name**: `mini-erp-server`
   - **Application and OS Images (AMI)**: Select **Ubuntu** (Ubuntu Server 24.04 LTS or 22.04 LTS, Free tier eligible).
   - **Architecture**: `64-bit (x86)`.
   - **Instance Type**: Select `t2.micro` (or `t3.micro` if in `us-east-1` or `eu-north-1`). *(Make sure it says "Free tier eligible")*.
5. **Key Pair (Login)**:
   - Click **Create new key pair**.
   - **Key pair name**: `minierp-key`.
   - **Key pair type**: `RSA`.
   - **Private key file format**: `.pem` (for Linux/macOS/OpenSSH) or `.ppk` (for PuTTY on Windows).
   - Click **Create key pair** and save the downloaded `minierp-key.pem` file safely.

---

## Step 2: Configure Security Group (Firewall)

In the **Network Settings** section while launching the instance:
1. Select **Create security group**.
2. Check the following checkboxes:
   - ✅ **Allow SSH traffic from**: `Anywhere` (`0.0.0.0/0`) or `My IP` (more secure).
   - ✅ **Allow HTTP traffic from the internet** (Port 80).
   - ✅ **Allow HTTPS traffic from the internet** (Port 443).
3. Click **Edit** on Security Groups to add custom ports for direct access:
   - Click **Add security group rule**:
     - **Type**: Custom TCP
     - **Port range**: `5173` (Frontend Web)
     - **Source**: `0.0.0.0/0` (Anywhere)
   - Click **Add security group rule**:
     - **Type**: Custom TCP
     - **Port range**: `3000` (Backend API)
     - **Source**: `0.0.0.0/0` (Anywhere)
4. **Configure Storage**:
   - Set to `20 GiB` or `30 GiB` of `gp3` (up to 30 GB is free).
5. Click **Launch Instance**.

---

## Step 3: Connect to your EC2 Instance

1. In the EC2 dashboard, click **Instances** and find your running instance.
2. Note your **Public IPv4 address** (e.g. `54.210.88.120`).
3. Open your terminal on your local machine:
   ```bash
   # Navigate to where your .pem key was downloaded
   cd ~/Downloads

   # Set restrictive permissions on the key file (required by SSH)
   chmod 400 minierp-key.pem

   # Connect to your EC2 instance (replace with your instance's Public IP)
   ssh -i "minierp-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
   ```

---

## Step 4: Install Docker & Docker Compose on EC2

Run the following commands inside your EC2 terminal to install the official Docker Engine and Docker Compose plugin:

```bash
# 1. Update package lists and install basic utilities
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git

# 2. Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. Add Docker repository to Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine, CLI, and Docker Compose Plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Allow ubuntu user to run Docker without sudo
sudo usermod -aG docker $USER

# 6. Apply group changes (or log out and log back in)
newgrp docker

# 7. Verify Docker installation
docker --version
docker compose version
```

---

## Step 5: Clone Project & Configure Environment

Clone your project repository onto the server:

```bash
# Clone the repository
git clone https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git mini-erp
cd mini-erp

# Create production .env from template
cp .env.example .env
```

Edit `.env` on the server:
```bash
nano .env
```

Update the configuration with your EC2 Public IP:
```env
NODE_ENV=production
PORT=3000
CLIENT_ORIGIN=http://<YOUR_EC2_PUBLIC_IP>:5173

DB_HOST=postgres
DB_PORT=5432
DB_NAME=mini_erp
DB_USER=mini_erp_app
DB_PASSWORD=A_Strong_Database_Password_123!
DB_SCHEMA=public

JWT_SECRET=Replace_With_A_Random_Long_Secret_String_At_Least_32_Chars
JWT_EXPIRES_IN=8h
SEED_USER_PASSWORD=AdminPassword_1234
```
*(Press `Ctrl+O`, then `Enter` to save, and `Ctrl+X` to exit nano)*.

---

## Step 6: Start Containers, Migrate & Seed

1. **Build and start containers in the background**:
   ```bash
   docker compose up -d --build
   ```

2. **Run database migrations**:
   ```bash
   docker compose exec api npm run prisma:deploy
   ```

3. **Seed demo users and sequence counters**:
   ```bash
   docker compose exec api npm run db:seed
   ```

4. **Verify running containers**:
   ```bash
   docker compose ps
   ```

🎉 **Congratulations!** Your application is now live on the internet:
- **Web Portal**: `http://<YOUR_EC2_PUBLIC_IP>:5173`
- **API Health**: `http://<YOUR_EC2_PUBLIC_IP>:3000/api/health`

---

## Step 7: (Optional) Free Domain & SSL with HTTPS

For production deployments with a custom domain and HTTPS (Port 80/443):

1. **Get a Free or Cheap Domain**:
   - Point an `A` record (e.g. `erp.yourdomain.com`) to your EC2 Public IP.

2. **Map Web Container Port to Standard HTTP (Port 80)**:
   In `docker-compose.yml`, change the `web` ports mapping:
   ```yaml
   web:
     ports:
       - "80:80"
   ```

3. **Install Certbot on Host for Automatic Let's Encrypt SSL**:
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   ```

---

## Step 8: Keep it Free (Best Practices)

To ensure your AWS bill remains **$0.00**:
1. **Stay with 1 `t2.micro` or `t3.micro` instance**: Running a single instance consumes 750 hours/month, which is covered 100% by the Free Tier.
2. **EBS Storage**: Keep total EBS storage under 30 GB.
3. **Set a Billing Alarm**:
   - In AWS Console, go to **Billing and Cost Management** -> **Budgets**.
   - Create a **Zero Spend Budget** or **Monthly Cost Budget ($1.00)**.
   - Enter your email address to receive immediate alerts if any non-free resources are used.
4. **Elastic IP**: Only allocate an Elastic IP if it is attached to a running EC2 instance. (AWS charges for unattached Elastic IPs).
