'use client';

import Link from 'next/link';
import { Button } from '../components/ui/Button';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reading App</h1>
        <div>
          <Link href="/login" className="mr-4">
            <Button variant="secondary">Log In</Button>
          </Link>
          <Link href="/signup">
            <Button>Sign Up</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center p-24">
        <h2 className="text-5xl font-bold mb-4">Unlock Your Child's Reading Potential</h2>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl">
          Track progress, discover new books, and make reading fun with our personalized assessments and engaging activities.
        </p>
        <Link href="/signup">
          <Button className="text-lg px-8 py-4">Get Started for Free</Button>
        </Link>
      </main>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-6">
          <h3 className="text-4xl font-bold text-center mb-12">Why Parents Love Reading App</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="text-2xl font-bold mb-2">Track Progress</h4>
              <p>See your child's words per minute, reading accuracy, and comprehension improve over time.</p>
            </div>
            <div className="text-center p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="text-2xl font-bold mb-2">Personalized Assessments</h4>
              <p>AI-generated passages based on your child's interests and reading level.</p>
            </div>
            <div className="text-center p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="text-2xl font-bold mb-2">Engaging Activities</h4>
              <p>Keep your child motivated with fun reading exercises and rewards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="p-4 text-center text-gray-500">
        © {new Date().getFullYear()} Reading App. All rights reserved.
      </footer>
    </div>
  );
}
