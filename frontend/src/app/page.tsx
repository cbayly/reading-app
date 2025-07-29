"use client";

import { useEffect, useState } from "react";

// Hook to handle hydration-safe theme
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (mounted) {
      localStorage.setItem('theme', newTheme);
    }
  };

  return { theme, toggleTheme, mounted };
}

export default function Home() {
  const [students, setStudents] = useState<{ id: number; name: string }[]>([]);
  const { theme, toggleTheme, mounted } = useTheme();

  useEffect(() => {
    fetch("http://localhost:5050/api/students")
      .then((res) => res.json())
      .then((data) => setStudents(data))
      .catch((err) => console.error("Error fetching students:", err));
  }, []);

  // Render loading state until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900 p-6">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300 ${
      isDark 
        ? 'bg-gray-900 text-gray-100' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Dark Mode Toggle */}
      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 px-4 py-2 rounded-lg shadow-md transition ${
          isDark
            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
        }`}
      >
        {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
      </button>

      {/* Header */}
      <h1 className="text-4xl font-bold mb-8">Student Portal</h1>

      {/* Student List Card */}
      <div className={`rounded-xl shadow-lg p-8 w-full max-w-md ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Student List
        </h2>
        <ul className="space-y-3">
          {students.length > 0 ? (
            students.map((student) => (
              <li
                key={student.id}
                className={`p-3 rounded-md transition ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {student.name}
              </li>
            ))
          ) : (
            <p className={`text-sm text-center ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Loading students...
            </p>
          )}
        </ul>
      </div>

      {/* Footer */}
      <footer className={`mt-12 text-sm ${
        isDark ? 'text-gray-400' : 'text-gray-500'
      }`}>
        Powered by Next.js + Tailwind CSS
      </footer>
    </div>
  );
}
