'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getAssessments, createAssessment, deleteStudent, updateStudent } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EditStudentModal from '@/components/EditStudentModal';
import AssessmentLoadingScreen from '@/components/AssessmentLoadingScreen';

interface Student {
  id: number;
  name: string;
  gradeLevel: number;
  interests: string;
  birthday: string;
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
  const [creatingAssessment, setCreatingAssessment] = useState<number | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingStudentName, setLoadingStudentName] = useState('');
  const [createdAssessmentId, setCreatedAssessmentId] = useState<number | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await getAssessments();
        console.log('Fetched students:', data);
        setStudents(data);
      } catch (err) {
        console.error('Error fetching students:', err);
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

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const handleSaveStudent = async (studentId: number, updatedData: Partial<Student>) => {
    try {
      setIsSaving(true);
      await updateStudent(studentId, updatedData);
      
      // Update the student in local state
      setStudents(prev => prev.map(student => 
        student.id === studentId 
          ? { ...student, ...updatedData }
          : student
      ));
    } catch (err) {
      console.error('Error updating student:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update student');
      }
      throw err; // Re-throw to let the modal handle it
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async (studentId: number, studentName: string) => {
    try {
      setIsDeleting(true);
      await deleteStudent(studentId);
      
      // Remove the student from the local state
      setStudents(prev => prev.filter(student => student.id !== studentId));
    } catch (err) {
      console.error('Error deleting student:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete student');
      }
      throw err; // Re-throw to let the modal handle it
    } finally {
      setIsDeleting(false);
    }
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
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Grade {student.gradeLevel}
                        </span>
                        <button
                          onClick={() => handleEditStudent(student)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                          title="Edit student"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
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
                        <>
                          <Button
                            className="w-full"
                            onClick={() => router.push(`/assessment/${latestAssessment.id}/results`)}
                          >
                            View Results
                          </Button>
                          <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => router.push(`/plan/${student.id}`)}
                          >
                            View Weekly Plan
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={async () => {
                            // Prevent multiple clicks
                            if (creatingAssessment === student.id) return;
                            
                            try {
                              setCreatingAssessment(student.id);
                              setLoadingStudentName(student.name);
                              setShowLoadingScreen(true);
                              console.log('Starting assessment for student:', student);
                              console.log('Making API call to createAssessment with studentId:', student.id);
                              
                              const response = await createAssessment(student.id);
                              console.log('API response received:', response);
                              console.log('Response type:', typeof response);
                              console.log('Response keys:', Object.keys(response || {}));
                              
                              // Handle different response structures
                              const assessment = response.assessment || response;
                              console.log('Assessment object:', assessment);
                              console.log('Assessment type:', typeof assessment);
                              console.log('Assessment keys:', Object.keys(assessment || {}));
                              
                              if (!assessment || !assessment.id) {
                                console.error('Assessment validation failed:', { assessment, hasId: assessment?.id });
                                throw new Error('Invalid assessment response from server');
                              }
                              
                              console.log('Setting createdAssessmentId to:', assessment.id);
                              setCreatedAssessmentId(assessment.id);
                              // Loading screen will handle the transition
                            } catch (err) {
                              console.error('Error creating assessment:', err);
                              setShowLoadingScreen(false);
                              setCreatingAssessment(null);
                              setCreatedAssessmentId(null);
                              if (err instanceof Error) {
                                setError(err.message);
                              } else {
                                setError('Failed to create assessment');
                              }
                            }
                          }}
                          disabled={creatingAssessment === student.id}
                        >
                          {creatingAssessment === student.id ? 'Creating Assessment...' : 'Start Assessment'}
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

      {/* Edit Student Modal */}
      <EditStudentModal
        student={editingStudent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveStudent}
        onDelete={handleDeleteStudent}
        isSaving={isSaving}
        isDeleting={isDeleting}
      />

      {/* Assessment Loading Screen */}
      <AssessmentLoadingScreen
        studentName={loadingStudentName}
        isVisible={showLoadingScreen}
        onComplete={() => {
          console.log('Loading screen onComplete called');
          console.log('Current createdAssessmentId:', createdAssessmentId);
          console.log('Current creatingAssessment:', creatingAssessment);
          
          setShowLoadingScreen(false);
          setCreatingAssessment(null);
          // Navigate to the assessment intro after loading completes
          if (createdAssessmentId) {
            console.log('Navigating to assessment intro:', createdAssessmentId);
            router.push(`/assessment/${createdAssessmentId}/intro`);
            setCreatedAssessmentId(null);
          } else {
            console.error('No assessment ID found for navigation');
            console.error('State at completion:', { createdAssessmentId, creatingAssessment });
            setError('Failed to create assessment. Please try again.');
          }
        }}
      />
    </div>
  );
} 