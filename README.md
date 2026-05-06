# 🚀 Next.js UI Playground

![Next.js](https://img.shields.io/badge/Next.js-000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-20232A?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql)
![Storybook](https://img.shields.io/badge/Storybook-FF4785?logo=storybook)

A modern **Next.js learning project** focused on building scalable UI systems, integrating Storybook, and working with real backend infrastructure using Prisma and PostgreSQL.

---

## ✨ Features

* ⚡ Built with **Next.js (App Router)**
* 🎨 Scalable and reusable UI architecture
* 📚 Storybook for isolated component development
* 🔄 Multi-calendar date conversion:

  * Jalali (Persian)
  * Gregorian
  * Arabic (Hijri)
* 🗄️ Prisma ORM + Neon (serverless PostgreSQL)
* 🔌 RESTful API routes

---

## 🖼️ Preview

> (Add screenshots here if available)

```md
![App Screenshot](./public/screenshot.png)
```

---

## 🛠️ Tech Stack

| Category      | Technology        |
| ------------- | ----------------- |
| Framework     | Next.js           |
| UI Library    | React             |
| Language      | TypeScript        |
| Component Dev | Storybook         |
| ORM           | Prisma            |
| Database      | PostgreSQL (Neon) |

---

## 📦 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/saeedheydari98/NEXT-UI.git
cd NEXT-UI
```

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Update with your Neon database URL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
```

> 🔑 Get your connection string from **Neon Console**

---

### 4. Database Setup

Push schema:

```bash
npx prisma db push
```

Generate Prisma client:

```bash
npx prisma generate
```

---

### 5. Run Development Server

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

### 6. Run Storybook

```bash
npm run storybook
```

---

### 7. Prisma Studio (Optional)

```bash
npx prisma studio
```

---

## 📁 Project Structure

```
NEXT-UI/
├── app/
│   ├── api/              # API routes
│   ├── date.converter/   # Main feature page
│   └── globals.css
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── .env.example
├── package.json
```

---

## 🗄️ Database Schema

### User

* A foundation for building an authentication system

### Conversion

Stores conversion history:

| Field     | Description      |
| --------- | ---------------- |
| date      | Original date    |
| fromType  | Source calendar  |
| toType    | Target calendar  |
| result    | Converted result |
| createdAt | Timestamp        |

---

## 🔄 API Endpoints

| Method | Endpoint         | Description    |
| ------ | ---------------- | -------------- |
| GET    | `/api/calendars` | List calendars |
| POST   | `/api/convert`   | Convert date   |
| POST   | `/api/save`      | Save history   |
| GET    | `/api/history`   | Fetch history  |

---

## 🤝 Team Collaboration

* Use separate Neon DB per developer OR shared staging DB
* Never commit `.env`
* Use `.env.example` as template
* After pulling changes:

```bash
npx prisma db push
```

---

## 🧠 Learning Goals

* Build scalable UI architecture
* Work with design systems
* Integrate Storybook into production apps
* Handle backend logic in Next.js API routes
* Practice DB migration (SQLite → PostgreSQL)
* Improve team workflows

---

## 📌 Notes

* Database is fully **serverless (Neon)**
* No local DB setup required
* Secure environment handling via `.env`
* Schema sync required after updates

---

## 🐛 Troubleshooting

### ❌ history.map is not a function

```bash
npx prisma db push
```

---

### ❌ Database connection error

Check `.env` → `DATABASE_URL`

---

### ❌ Prisma Client not found

```bash
npx prisma generate
```

---

## 📈 Future Improvements

* 🔐 Authentication system (NextAuth)
* 🌐 Internationalization (i18n)
* 📊 Analytics dashboard
* 🧩 Component library export
* 🧪 Testing (Jest + React Testing Library)

---

## 👤 Author

**Saeed Heydari**

* GitHub: https://github.com/saeedheydari98

---

## 📄 License

This project is licensed for **learning and educational purposes only**.

---

⭐ If you found this project useful, consider giving it a star!
