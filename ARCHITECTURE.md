# Fullstack Template — Architecture

## Stack

| Layer     | Tech                                          |
|-----------|-----------------------------------------------|
| Frontend  | Vite · React 19 · TypeScript · React Router 7 |
| Backend   | Node.js · Express 5 · TypeScript              |
| Database  | PostgreSQL · Prisma ORM                       |
| Auth      | JWT · bcryptjs                                |
| Validation| Zod (backend env + запросы)                   |

---

## Project structure

```
fullstack-template/
├── frontend/
└── backend/
```

---

## Frontend

### Запуск

```bash
cd frontend
cp .env.example .env
npm install
npm run dev        # http://localhost:5173
```

### Структура `src/`

```
src/
├── context/
│   └── AuthContext.tsx     # React-контекст авторизации
├── hooks/
│   └── useAuth.ts          # хук — re-export из AuthContext
├── lib/
│   └── api.ts              # fetch-обёртка для запросов к бэкенду
├── pages/
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   └── NotFoundPage.tsx
├── router/
│   ├── index.tsx           # BrowserRouter + Routes
│   ├── PrivateRoute.tsx    # редирект на /login если не авторизован
│   └── PublicRoute.tsx     # Outlet-обёртка для публичных роутов
├── types/
│   └── auth.ts             # User, LoginPayload, RegisterPayload, AuthResponse
├── App.tsx                 # AuthProvider + AppRouter
└── main.tsx                # точка входа
```

### `lib/api.ts` — HTTP-клиент

Тонкая обёртка над `fetch`. Автоматически:
- добавляет `Content-Type: application/json`
- читает `localStorage.getItem('token')` и добавляет `Authorization: Bearer <token>`
- бросает `Error` с текстом из тела ответа при `!res.ok`

```ts
import { api } from '@/lib/api'

const data = await api.get<User[]>('/api/users')
const result = await api.post<AuthResponse>('/api/auth/login', { email, password })
```

В dev все вызовы `/api/...` проксируются через Vite на `localhost:3000` — CORS не нужен.  
В production задай `VITE_API_URL=https://api.example.com` в `.env`.

### `context/AuthContext.tsx` — авторизация

При монтировании `AuthProvider`:
1. Проверяет `localStorage` на наличие токена.
2. Если токен есть — вызывает `GET /api/auth/me` для валидации и загрузки пользователя.
3. Устанавливает `isLoading = false` по завершению.

Экспортирует:

| Поле / метод      | Тип                            | Описание                              |
|-------------------|--------------------------------|---------------------------------------|
| `user`            | `User \| null`                 | текущий пользователь                  |
| `isAuthenticated` | `boolean`                      | `!!user`                              |
| `isLoading`       | `boolean`                      | `true` пока идёт проверка токена      |
| `login(payload)`  | `(LoginPayload) => Promise<void>` | POST /api/auth/login, сохраняет токен |
| `register(payload)`| `(RegisterPayload) => Promise<void>` | POST /api/auth/register          |
| `logout()`        | `() => void`                   | удаляет токен, сбрасывает user        |

### `router/` — маршрутизация

| Компонент       | Поведение                                                    |
|-----------------|--------------------------------------------------------------|
| `PrivateRoute`  | Ожидает `isLoading`, затем редиректит на `/login` если `!isAuthenticated` |
| `PublicRoute`   | Просто рендерит `<Outlet />`. Добавь сюда общий layout при необходимости |

Добавление нового роута:

```tsx
// router/index.tsx

// Публичный
<Route element={<PublicRoute />}>
  <Route path="/about" element={<AboutPage />} />
</Route>

// Приватный
<Route element={<PrivateRoute />}>
  <Route path="/settings" element={<SettingsPage />} />
</Route>
```

### `types/auth.ts` — общие типы

Держи в синхронизации с тем, что реально возвращает бэкенд.  
При расширении модели `User` (например, добавить `name`) — правь здесь и в `prisma/schema.prisma`.

### `.env` переменные (frontend)

| Переменная     | По умолчанию | Описание                                         |
|----------------|--------------|--------------------------------------------------|
| `VITE_API_URL` | `""` (пусто) | Пусто = Vite proxy. В prod: `https://api.example.com` |

---

## Backend

### Запуск

```bash
cd backend
cp .env.example .env   # заполни DATABASE_URL и JWT_SECRET
npm install
npm run db:generate    # сгенерировать Prisma-клиент
npm run db:migrate     # применить миграции (нужна запущенная БД)
npm run dev            # http://localhost:3000
```

### Структура `src/`

```
src/
├── config/
│   └── env.ts              # zod-валидация переменных окружения
├── lib/
│   └── prisma.ts           # Prisma Client singleton
├── middlewares/
│   ├── errorHandler.ts     # глобальный обработчик ошибок + класс AppError
│   └── requireAuth.ts      # JWT-верификация, пишет req.user
├── routes/
│   ├── index.ts            # корневой роутер (/api/health + подключение модулей)
│   └── auth.ts             # /api/auth/register, /login, /me
├── types/
│   └── express.d.ts        # расширение Request: добавляет поле user
├── app.ts                  # Express-приложение: cors, json, роуты, errorHandler
└── server.ts               # запуск HTTP-сервера
```

### `config/env.ts` — переменные окружения

Zod парсит `process.env` при старте. Если обязательная переменная отсутствует — сервер падает сразу с понятной ошибкой.

| Переменная      | Обязательная | Дефолт                    | Описание                   |
|-----------------|:------------:|---------------------------|----------------------------|
| `PORT`          |              | `3000`                    | порт сервера               |
| `NODE_ENV`      |              | `development`             | окружение                  |
| `DATABASE_URL`  | ✓            | —                         | строка подключения Postgres |
| `JWT_SECRET`    | ✓            | —                         | секрет подписи токенов     |
| `JWT_EXPIRES_IN`|              | `7d`                      | время жизни токена         |
| `CORS_ORIGIN`   |              | `http://localhost:5173`   | разрешённый origin         |

### `lib/prisma.ts` — Prisma singleton

Один экземпляр `PrismaClient` на весь процесс. В dev hot-reload не создаёт новые соединения благодаря записи в `globalThis`.

Использование в любом файле:

```ts
import { prisma } from '../lib/prisma'

const user = await prisma.user.findUnique({ where: { email } })
```

### `middlewares/errorHandler.ts` — обработка ошибок

Класс `AppError` для предсказуемых ошибок:

```ts
import { AppError } from '../middlewares/errorHandler'

throw new AppError(404, 'User not found')   // → { message: 'User not found' }, HTTP 404
throw new AppError(401, 'Unauthorized')     // → { message: 'Unauthorized' }, HTTP 401
```

Любая не-`AppError` возвращает `500 Internal Server Error` (с логированием в консоль).

### `middlewares/requireAuth.ts` — защита роутов

Читает `Authorization: Bearer <token>`, верифицирует JWT, кладёт `{ id, email }` в `req.user`.

```ts
import { requireAuth } from '../middlewares/requireAuth'

router.get('/profile', requireAuth, (req, res) => {
    res.json(req.user)  // { id, email }
})
```

### `routes/auth.ts` — auth-эндпоинты

| Метод | Путь               | Auth | Статус         |
|-------|--------------------|:----:|----------------|
| POST  | `/api/auth/register` |      | 501 (TODO)     |
| POST  | `/api/auth/login`    |      | 501 (TODO)     |
| GET   | `/api/auth/me`       | ✓    | возвращает `req.user` |

### Добавление нового роутера

```ts
// src/routes/users.ts
import { Router } from 'express'
import { requireAuth } from '../middlewares/requireAuth'

export const usersRouter = Router()
usersRouter.get('/', requireAuth, async (_req, res) => { ... })
```

```ts
// src/routes/index.ts
import { usersRouter } from './users'
router.use('/users', usersRouter)   // → /api/users
```

### `prisma/schema.prisma` — схема БД

Уже определена модель `User`. При изменении схемы:

```bash
npm run db:migrate   # создаёт SQL-миграцию и применяет её
npm run db:generate  # перегенерирует типы Prisma-клиента
```

---

## Как подключить всё при создании нового проекта

### Обязательно

- [ ] `backend/.env` — заполнить `DATABASE_URL` и `JWT_SECRET`
- [ ] `backend/src/routes/auth.ts` — реализовать `POST /register` и `POST /login`
  - валидация тела через zod
  - хэширование пароля через `bcryptjs`
  - создание/поиск пользователя через `prisma.user`
  - подпись JWT через `jsonwebtoken` и `env.JWT_SECRET`
- [ ] `backend/prisma/schema.prisma` — расширить модель `User` нужными полями, добавить другие модели
- [ ] `backend/src/config/env.ts` — добавить новые переменные окружения если нужно

### По необходимости

- [ ] `frontend/src/types/auth.ts` — обновить `User` если добавил поля в схему
- [ ] `frontend/src/router/index.tsx` — добавить/убрать роуты
- [ ] `frontend/src/pages/` — наполнить страницы реальным UI
- [ ] `frontend/src/context/AuthContext.tsx` — изменить стратегию хранения токена (например, `httpOnly` cookie вместо localStorage)
- [ ] `backend/src/app.ts` — поменять `CORS_ORIGIN` в `.env` на реальный домен в prod

### Необязательно, но рекомендуется для prod

- [ ] Refresh-токены (отдельная таблица `RefreshToken` в Prisma)
- [ ] Rate limiting (`express-rate-limit`)
- [ ] Helmet (`helmet`) для HTTP-заголовков безопасности
- [ ] Логирование запросов (`morgan` или `pino-http`)
- [ ] Валидация request body через zod в каждом роуте

---

## Поток авторизации (end-to-end)

```
Пользователь вводит email/password
        ↓
LoginPage вызывает useAuth().login(payload)
        ↓
AuthContext → api.post('/api/auth/login', payload)
        ↓
Vite proxy (dev) / VITE_API_URL (prod) → Express POST /api/auth/login
        ↓
Валидация → bcrypt.compare → jwt.sign
        ↓
{ token, user } → AuthContext сохраняет token в localStorage, user в state
        ↓
PrivateRoute видит isAuthenticated=true → пускает на /dashboard

При обновлении страницы:
AuthProvider монтируется → читает token из localStorage
        ↓
GET /api/auth/me (с Bearer token) → requireAuth → prisma.user.findUnique
        ↓
user загружен → isLoading=false → роутер работает корректно
```
