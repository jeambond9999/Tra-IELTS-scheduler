# Meng Schedule

Meng Schedule is a Ruby on Rails scheduling website with a React/Inertia
frontend, Vite asset build, and PostgreSQL database.

## Source Code Handover

The source code can be shared as a `.zip` file. The receiving technical team can
unzip the project to inspect the code, or clone the Git repository if repository
access is available.

This repository contains application source code only. It does not include
production passwords, database passwords, server credentials, API secrets, or
private environment values.

## Current Hosting

The current website is hosted on a personal VPS and deployed with Dokploy.

Detailed VPS credentials are not included in this handover. The recommended next
step is for the company technical team to create a new company-owned VPS or
hosting account, install Dokploy there, and redeploy this source code under the
company's own infrastructure.

## Technology Stack

- Ruby 3.4.7
- Ruby on Rails 8
- React with Inertia.js
- Vite
- PostgreSQL
- Docker/Dockerfile for production deployment
- Dokploy for VPS deployment management

## Local Setup

Install the required tools first:

- Ruby 3.4.7
- Node.js
- PostgreSQL
- Bundler
- npm

Unzip the source code and open the project folder in a terminal. If using Git,
clone the repository and enter the project folder instead.

Install dependencies:

```bash
bundle install
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Update `.env` with the local PostgreSQL username, password, host, port, and
database names.

Create and prepare the database:

```bash
bin/rails db:create
bin/rails db:migrate
bin/rails db:seed
```

Run the website locally:

```bash
bin/dev
```

Open the local website:

```text
http://localhost:3000
```

Run checks:

```bash
bin/rails test
npm run check
```

## Dokploy Deployment Guide

For a new production deployment, use a company-owned VPS or hosting account.

High-level steps:

1. Install Dokploy on the new VPS.
2. Create a PostgreSQL database/service in Dokploy.
3. Create a new Dokploy application from this source code.
4. Configure the application to build with the included `Dockerfile`.
5. Set the production environment variables in Dokploy.
6. Attach the company domain to the Dokploy application.
7. Enable SSL/HTTPS through Dokploy.
8. Deploy the application.

The Dockerfile exposes port `80`, so Dokploy should route traffic to the app
container on port `80`.

Important production environment variables:

```text
RAILS_ENV=production
RAILS_MASTER_KEY=<production Rails master key or new key managed by the company>
DATABASE_URL=<production PostgreSQL connection URL>
CACHE_DATABASE_URL=<optional; can reuse DATABASE_URL>
QUEUE_DATABASE_URL=<optional; can reuse DATABASE_URL>
CABLE_DATABASE_URL=<optional; can reuse DATABASE_URL>
SOLID_QUEUE_IN_PUMA=true
```

Optional variables if these features are used:

```text
GOOGLE_CLIENT_ID=<Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth client secret>
R2_ENDPOINT=<Cloudflare R2 endpoint>
R2_ACCESS_KEY_ID=<Cloudflare R2 access key ID>
R2_SECRET_ACCESS_KEY=<Cloudflare R2 secret access key>
R2_BUCKET=<Cloudflare R2 bucket>
R2_REGION=auto
```

Production secrets should be stored in Dokploy environment variables or a
company password manager. Do not send real passwords or API secrets in plain
email or group chat.

## Data Migration

The source code does not include production data.

If the company needs to keep existing live data, the technical team should export
the current PostgreSQL database and import it into the new company-owned
database before switching the domain to the new deployment.

## Scheduler Workflow

The current scheduler version uses dropdown identity selection.

- Teacher: select a teacher name, open or close available slots, view KPI and
  student progress.
- Sales: select a sales name, choose a teacher calendar, and book recurring
  lessons for students.
- CS: select a CS name, choose a teacher calendar, update lesson status, and
  reschedule lessons.

All users read and write the same shared PostgreSQL schedule.

## References

- Ruby on Rails Guides: https://guides.rubyonrails.org/
- Dokploy Documentation: https://docs.dokploy.com/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Docker Documentation: https://docs.docker.com/
