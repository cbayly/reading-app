'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getAssessments, createAssessment } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Student {
  id: number;
  name: string;
  gradeLevel: number;
  assessments: Array<{
    id: number;
    status: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingAssessment, setCreatingAssessment] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await getAssessments();
        setStudents(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load students');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const handleLogout = () => {
    logout();
    // Redirect will be handled by middleware
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Reading Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Welcome back, {user?.name || 'Parent'}!
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/setup">
                <Button variant="secondary">Add Student</Button>
              </Link>
              <Button variant="secondary" onClick={handleLogout}>
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {students.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to Reading App!
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Get started by adding your first child and taking a reading assessment.
            </p>
            <Link href="/setup">
              <Button className="text-lg px-8 py-4">
                Add Your First Student
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Your Students
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map((student) => {
                const latestAssessment = student.assessments[0];
                const hasCompletedAssessment = latestAssessment?.status === 'completed';
                
                return (
                  <div key={student.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {student.name}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Grade {student.gradeLevel}
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Reading Assessment Status:
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        hasCompletedAssessment
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {hasCompletedAssessment ? 'Completed' : 'Not Started'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {hasCompletedAssessment ? (
                        <Button
                          className="w-full"
                          onClick={() => router.push(`/assessment/${latestAssessment.id}/results`)}
                        >
                          View Results
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={async () => {
                            try {
                              setCreatingAssessment(true);
                              const { assessment } = await createAssessment(student.id);
                              router.push(`/assessment/${assessment.id}/intro`);
                            } catch (err) {
                              if (err instanceof Error) {
                                setError(err.message);
                              } else {
                                setError('Failed to create assessment');
                              }
                              setCreatingAssessment(false);
                            }
                          }}
                          disabled={creatingAssessment}
                        >
                          {creatingAssessment ? 'Creating Assessment...' : 'Start Assessment'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 