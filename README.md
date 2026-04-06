# FightPass

Plataforma academica para gestao de academias e alunos de artes marciais, desenvolvida como projeto de TCC.

O projeto esta dividido em duas partes:

- `fightpass-frontend`: prototipo visual em HTML, CSS e JavaScript
- `fightpass-backend`: API em Node.js com persistencia em MySQL

Nesta etapa do TCC, frontend e backend permanecem separados. A integracao entre as camadas sera realizada nas proximas entregas.

## Get Started

### 1. Pre-requisitos

Antes de comecar, tenha instalado na maquina:

- Node.js 22 ou superior
- npm 10 ou superior
- MySQL 8 ou superior
- Git

Para confirmar:

```powershell
node -v
npm -v
mysql --version
```

### 2. Clonar o projeto

```powershell
git clone <url-do-repositorio>
cd tcc-2025-1-e-2-fightpass
```

### 3. Configurar o banco de dados

Abra o MySQL e crie o banco que sera usado pela aplicacao:

```sql
CREATE DATABASE fightpass CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Se quiser usar outro nome de banco, ele deve ser o mesmo valor informado no arquivo `.env` do backend.

### 4. Configurar o backend

Entre na pasta do backend:

```powershell
cd fightpass-backend
```

Copie o arquivo de exemplo de ambiente:

```powershell
Copy-Item .env.example .env
```

Depois ajuste os dados do banco no arquivo `.env`:

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

Campos principais:

- `DB_HOST`: endereco do servidor MySQL
- `DB_PORT`: porta do MySQL
- `DB_NAME`: nome do banco de dados
- `DB_USER`: usuario do MySQL
- `DB_PASSWORD`: senha do MySQL
- `JWT_SECRET`: chave usada para gerar os tokens de autenticacao

### 5. Instalar dependencias do backend

```powershell
npm install
```

### 6. Criar a estrutura do banco

Execute a migration:

```powershell
npm run migrate
```

Esse comando cria as tabelas principais do sistema, incluindo:

- usuarios
- perfis
- instituicoes
- modalidades
- turmas e horarios
- matriculas
- agendamentos
- tokens de check-in
- presencas
- avaliacoes
- historico de progresso

### 7. Popular o banco com dados de exemplo

```powershell
npm run seed
```

O seed insere dados iniciais para testes, como:

- perfis de usuario
- modalidades
- uma instituicao de exemplo
- um instrutor
- um aluno
- turmas e horarios
- agendamentos iniciais
- avaliacoes e snapshots de progresso

### 8. Executar a API

```powershell
npm run dev
```

Por padrao, a API ficara disponivel em:

```text
http://localhost:3000
```

Teste de saude da API:

```text
GET /api/health
```

Exemplo completo:

```text
http://localhost:3000/api/health
```

### 9. Executar o frontend

O frontend esta em HTML estatico. Nesta fase, ele pode ser aberto diretamente no navegador ou executado com uma extensao de servidor local, como Live Server.

Arquivo inicial:

```text
fightpass-frontend/index.html
```

Observacao importante:

- nesta etapa, o frontend nao consome o backend diretamente
- o backend ja esta pronto para integracao futura
- as telas funcionam como base visual e documental da aplicacao

## Estrutura do projeto

```text
fightpass/
|-- fightpass-frontend/
|-- fightpass-backend/
|   |-- scripts/
|   |-- src/
|   |   |-- config/
|   |   |-- database/
|   |   |   |-- migrations/
|   |   |   |-- seeders/
|   |   |-- lib/
|   |   |-- routes/
|-- docs/
```

## Principais rotas da API

Autenticacao:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Perfil:

- `GET /api/profile`
- `PUT /api/profile`
- `PUT /api/profile/password`

Catalogo:

- `GET /api/modalities`
- `GET /api/map/search`
- `GET /api/institutions`
- `GET /api/institutions/:id`
- `GET /api/institutions/:id/students`

Turmas:

- `GET /api/classes`
- `GET /api/classes/:id`
- `POST /api/classes`

Agendamentos:

- `GET /api/bookings`
- `POST /api/bookings`
- `POST /api/bookings/recurring`
- `DELETE /api/bookings/:id`

Check-in:

- `POST /api/checkin/token`
- `POST /api/checkin/confirm`
- `GET /api/checkin/history`

Avaliacoes:

- `GET /api/students/:id/evaluations`
- `POST /api/students/:id/evaluations`
- `GET /api/students/:id/profile`
- `GET /api/students/:id/progress`

Dashboards:

- `GET /api/dashboard/student`
- `GET /api/dashboard/institution/:id`

## Usuarios de exemplo

Os seeds usam contas demonstrativas. As senhas estao salvas com hash no banco.

Exemplos de e-mails inseridos:

- `contato@dojosakura.com`
- `carlos@dojosakura.com`
- `joao@fightpass.com`

Se quiser controlar melhor os testes, o caminho mais simples e rodar o seed e depois cadastrar novos usuarios pela rota de registro.

## Documentacao complementar

O material de apoio da documentacao do TCC esta em:

- `docs/tcc-documentacao-base.md`

## Proximos passos

- integrar frontend e backend
- adicionar testes automatizados
- implantar a aplicacao em nuvem
- preparar ambiente online para apresentacao da banca
