# Reading App

A full-stack student portal application built with Next.js, Express, and Prisma.

## Features

- 🌓 **Dark/Light Mode Toggle** - Persistent theme preferences
- 📚 **Student Management** - View and manage student data
- 🎨 **Modern UI** - Built with Tailwind CSS
- 🔗 **Full-Stack** - Frontend and backend API integration
- 📱 **Responsive Design** - Works on all devices

## Tech Stack

### Frontend
- **Next.js 15** - React framework with SSR
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe JavaScript

### Backend
- **Express.js** - Web application framework
- **Prisma** - Database toolkit and ORM
- **CORS** - Cross-origin resource sharing

## Project Structure

```
reading-app/
├── frontend/          # Next.js frontend
│   ├── src/
│   │   └── app/
│   └── package.json
├── backend/           # Express.js backend
│   ├── src/
│   │   └── index.js
│   └── package.json
├── prisma/           # Database schema
│   └── schema.prisma
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd reading-app
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Start the development servers**
   
   **Backend (Terminal 1):**
   ```bash
   cd backend
   npm run dev
   ```
   
   **Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000 (or next available port)
   - Backend API: http://localhost:5050

## API Endpoints

- `GET /` - Health check
- `GET /api/students` - Get all students

## Development

### Frontend Development
The frontend is built with Next.js 15 and includes:
- Server-side rendering (SSR)
- Dark mode with system preference detection
- Responsive design with Tailwind CSS
- TypeScript for type safety

### Backend Development
The backend provides a RESTful API with:
- Express.js server
- CORS enabled for frontend communication
- Structured error handling
- Development logging

## Deployment

### Recommended Hosting Services

**Option 1: Vercel + Railway**
- Frontend: Deploy to Vercel (optimized for Next.js)
- Backend: Deploy to Railway with PostgreSQL

**Option 2: Netlify + Render**
- Frontend: Deploy to Netlify
- Backend: Deploy to Render with database

**Option 3: Railway (Full-stack)**
- Deploy entire application to Railway

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE). 