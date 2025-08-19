# Reading App Setup Guide

## 🚀 Quick Start

The reading app is now set up and ready to use! Here's how to get started:

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Environment Setup

The app has been configured with the following environment files:

#### Backend (.env)
- Database: SQLite (file: `./dev.db`)
- JWT Secret: Configured for development
- OpenAI API Key: **You need to add your own OpenAI API key**
- Port: 5050

#### Frontend (.env.local)
- API URL: `http://localhost:5050/api`
- Port: 3000

### Starting the Application

#### Option 1: Use the start script (Recommended)
```bash
./start-app.sh
```

#### Option 2: Start services manually

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5050

### Database

The database has been initialized with:
- Sample students (from The Office TV show)
- WPM benchmarks for different grade levels
- All necessary tables and relationships

### Important Notes

1. **OpenAI API Key**: You need to add your own OpenAI API key to `backend/.env`:
   ```
   OPENAI_API_KEY="your-actual-openai-api-key-here"
   ```

2. **First Login**: Use the following credentials to log in:
   - Email: `cam@example.com`
   - Password: `password123`

3. **Sample Students**: The app comes with 10 sample students with different interests and grade levels.

### Features Available

- **Reading Assessments**: Generate personalized reading passages and questions
- **Weekly Plans**: Create custom reading plans based on student interests
- **Progress Tracking**: Monitor student reading progress and scores
- **Parent Dashboard**: Manage multiple students and view their progress

### Development

- Backend uses Express.js with Prisma ORM
- Frontend uses Next.js 15 with TypeScript
- Database is SQLite for easy development
- JWT authentication for secure access

### Troubleshooting

If you encounter issues:

1. **Port conflicts**: Make sure ports 3000 and 5050 are available
2. **Database issues**: Run `cd backend && npx prisma migrate reset` to reset the database
3. **Dependencies**: Run `npm install` in both `backend/` and `frontend/` directories
4. **OpenAI errors**: Ensure your API key is valid and has sufficient credits

### Next Steps

1. Add your OpenAI API key to `backend/.env`
2. Start the application using `./start-app.sh`
3. Navigate to http://localhost:3000
4. Log in with the provided credentials
5. Start creating reading assessments and weekly plans!

## 🎉 Enjoy your Reading App!
