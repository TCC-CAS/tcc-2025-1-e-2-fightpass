# FightPass Backend

API do projeto FightPass desenvolvida em Node.js com Express e MySQL.

## Objetivo

Este backend centraliza a logica de negocio da plataforma, incluindo:

- autenticacao e controle de acesso
- cadastro de usuarios e instituicoes
- busca de academias e modalidades
- criacao de turmas
- agendamento e cancelamento de aulas
- check-in por QR Code
- avaliacao de alunos
- dashboards de acompanhamento

## Stack

- Node.js
- Express
- MySQL
- JWT para autenticacao
- `express-validator` para validacoes
- SQL versionado em arquivos

## Requisitos

- Node.js 22+
- npm 10+
- MySQL 8+

## Configuracao

### 1. Instale as dependencias

```powershell
npm install
```

### 2. Crie o arquivo `.env`

```powershell
Copy-Item .env.example .env
```

### 3. Preencha as variaveis de ambiente

```env
PORT=3000
NODE_ENV=development
APP_NAME=FightPass API
APP_URL=http://localhost:3000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=fightpass
DB_USER=root
DB_PASSWORD=

JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=8h
CHECKIN_TOKEN_TTL_SECONDS=45
BOOKING_CANCELLATION_LIMIT_HOURS=2
```

## Banco de dados

### 1. Criar o banco no MySQL

```sql
CREATE DATABASE fightpass CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Executar as migrations

```powershell
npm run migrate
```

Arquivo principal de schema:

- `src/database/migrations/001_initial_schema.sql`

### 3. Executar os seeds

```powershell
npm run seed
```

Arquivo principal de dados iniciais:

- `src/database/seeders/001_seed_demo.sql`

## Execucao

Modo desenvolvimento:

```powershell
npm run dev
```

Modo normal:

```powershell
npm start
```

Teste rapido:

```text
GET http://localhost:3000/api/health
```

## Estrutura

```text
fightpass-backend/
|-- scripts/
|-- src/
|   |-- app.js
|   |-- server.js
|   |-- config/
|   |-- database/
|   |   |-- migrations/
|   |   |-- seeders/
|   |-- lib/
|   |-- routes/
|   |   |-- index.js
|   |   |-- modules/
```

## Modulos disponiveis

- `auth`: login, cadastro, recuperacao e redefinicao de senha
- `profile`: leitura e atualizacao do perfil
- `catalog`: modalidades, instituicoes e busca de academias
- `classes`: criacao e consulta de turmas
- `bookings`: agendamento simples e recorrente
- `checkin`: geracao e confirmacao de token de presenca
- `evaluations`: avaliacao tecnica e evolucao do aluno
- `dashboard`: indicadores do aluno e da instituicao

## Rotas principais

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Profile

- `GET /api/profile`
- `PUT /api/profile`
- `PUT /api/profile/password`

### Catalog

- `GET /api/modalities`
- `GET /api/map/search`
- `GET /api/institutions`
- `GET /api/institutions/:id`
- `GET /api/institutions/:id/students`

### Classes

- `GET /api/classes`
- `GET /api/classes/:id`
- `POST /api/classes`

### Bookings

- `GET /api/bookings`
- `POST /api/bookings`
- `POST /api/bookings/recurring`
- `DELETE /api/bookings/:id`

### Check-in

- `POST /api/checkin/token`
- `POST /api/checkin/confirm`
- `GET /api/checkin/history`

### Evaluations

- `GET /api/students/:id/evaluations`
- `POST /api/students/:id/evaluations`
- `GET /api/students/:id/profile`
- `GET /api/students/:id/progress`

### Dashboard

- `GET /api/dashboard/student`
- `GET /api/dashboard/institution/:id`

## Observacoes

- O frontend ainda nao esta integrado ao backend nesta etapa.
- O banco foi preparado para MySQL.
- A API ja esta estruturada para integracao futura e publicacao em nuvem.
