'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { getAssessments, createAssessment, deleteStudent, updateStudent, deleteCurrentPlanForStudent, getPlanByStudentId } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EditStudentModal from '@/components/EditStudentModal';
import AssessmentLoadingScreen from '@/components/AssessmentLoadingScreen';
import ErrorBoundary from '@/components/ErrorBoundary';
import CreatePlan3Button from '@/components/CreatePlan3Button';

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
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingAssessment, setCreatingAssessment] = useState<number | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingPlanStudentId, setDeletingPlanStudentId] = useState<number | null>(null);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingStudentName, setLoadingStudentName] = useState('');
  const [toast, setToast] = useState<{open: boolean; message: string; type?: 'success'|'error'|'info'}>({open: false, message: ''});
  const [plansByStudent, setPlansByStudent] = useState<Record<number, { exists: boolean; planId?: number }>>({});
  
  // Add ref to prevent duplicate requests in Strict Mode
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    console.log('Dashboard useEffect triggered, authLoading:', authLoading);
    
    // Only fetch if auth is loaded and we haven't fetched yet
    if (!authLoading && !hasFetchedRef.current) {
      hasFetchedRef.current = true; // Prevent duplicate requests
      console.log('Auth loading is false, starting to fetch students...');
      setStudentsLoading(true);
      
      const fetchStudents = async () => {
        try {
          console.log('Starting to fetch students...');
          // Debug: Check if user is authenticated
          console.log('Current user:', user);
          console.log('Auth loading state:', authLoading);
          
          // Debug: Check JWT token in cookies
          const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('token='))
            ?.split('=')[1];
          console.log('JWT token in cookie:', token ? 'Present' : 'Missing');
          if (token) {
            console.log('Token preview:', token.substring(0, 50) + '...');
          }

          const data = await getAssessments();
          console.log('Fetched students:', data);
          setStudents(data);

          // After loading students, check if each has a current plan
          try {
            const results = await Promise.all(
              (data || []).map(async (s: Student) => {
                try {
                  const planRes: any = await getPlanByStudentId(s.id);
                  if (!planRes) {
                    return [s.id, { exists: false }] as const;
                  }
                  const planId = planRes?.plan?.id ?? planRes?.id;
                  return [s.id, { exists: true, planId }] as const;
                } catch (e: any) {
                  // For other errors, default to unknown/false without breaking dashboard
                  console.warn('Plan check error for student', s.id, e);
                  return [s.id, { exists: false }] as const;
                }
              })
            );
            setPlansByStudent(Object.fromEntries(results));
          } catch (planCheckErr) {
            console.warn('Bulk plan check failed:', planCheckErr);
          }
        } catch (err) {
          console.error('Error fetching students:', err);
          console.error('Error details:', {
            message: err instanceof Error ? err.message : 'Unknown error',
            status: (err as { response?: { status?: number } })?.response?.status,
            data: (err as { response?: { data?: unknown } })?.response?.data
          });
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Failed to load students');
          }
        } finally {
          setStudentsLoading(false);
        }
      };

      fetchStudents();
    } else {
      console.log('Auth still loading, waiting...');
    }
  }, [authLoading]); // Depend on auth loading state

  // Cleanup effect to ensure loading screen is hidden when component unmounts
  useEffect(() => {
    return () => {
      setShowLoadingScreen(false);
      setCreatingAssessment(null);
    };
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

  if (authLoading) {
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
    <ErrorBoundary>
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
          <div className="mb-6">
            <div className="p-4 border rounded-lg bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200" role="alert">
              <div className="flex items-start">
                <svg className="h-5 w-5 mt-0.5 me-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.594c.75 1.336-.213 3.007-1.742 3.007H3.48c-1.53 0-2.492-1.67-1.743-3.007L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V7a1 1 0 112 0v4a1 1 0 01-1 1z" clipRule="evenodd"/></svg>
                <div>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
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
                const hasAnyAssessment = student.assessments.length > 0;
                const hasPlan = plansByStudent[student.id]?.exists === true;
                
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
                          {hasPlan && (
                            <>
                              <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => router.push(`/plan3/${plansByStudent[student.id]?.planId}`)}
                              >
                                View 3-Day Plan
                              </Button>
                              <button
                                className={`w-full inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm ${deletingPlanStudentId === student.id ? 'border-red-100 text-red-300' : 'border-red-200 text-red-700 hover:bg-red-50'}`}
                                disabled={deletingPlanStudentId === student.id}
                                onClick={async () => {
                                  if (!confirm(`Delete current plan for ${student.name}? This cannot be undone.`)) return;
                                  try {
                                    setDeletingPlanStudentId(student.id);
                                    const res = await deleteCurrentPlanForStudent(student.id);
                                    setToast({ open: true, message: res.message || 'Deleted current plan', type: 'success' });
                                    setPlansByStudent(prev => ({ ...prev, [student.id]: { exists: false } }));
                                  } catch (e: any) {
                                    setToast({ open: true, message: e?.response?.data?.message || 'Failed to delete plan', type: 'error' });
                                  } finally {
                                    setDeletingPlanStudentId(null);
                                  }
                                }}
                              >
                                {deletingPlanStudentId === student.id ? 'Deleting…' : 'Delete Current Plan'}
                              </button>
                            </>
                          )}
                          
                          {/* Plan3 Creation Button */}
                          <CreatePlan3Button
                            studentId={student.id}
                            studentName={student.name}
                            className="w-full"
                          />
                        </>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={async () => {
                            // Prevent multiple clicks
                            if (creatingAssessment === student.id) return;
                            
                            // If there's an existing assessment, navigate to it
                            if (hasAnyAssessment && latestAssessment) {
                              router.push(`/assessment/${latestAssessment.id}/intro`);
                              return;
                            }
                            
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
                              
                              // Navigate immediately after successful creation to avoid race with loader timer
                              router.push(`/assessment/${assessment.id}/intro`);
                              // Clean up loader/state
                               setShowLoadingScreen(false);
                              setCreatingAssessment(null);
                               setToast({open: true, message: 'Assessment created successfully', type: 'success'});
                            } catch (err) {
                              console.error('Error creating assessment:', err);
                              setShowLoadingScreen(false);
                              setCreatingAssessment(null);
                              if (err instanceof Error) {
                                setError(err.message);
                                 setToast({open: true, message: err.message, type: 'error'});
                              } else {
                                setError('Failed to create assessment');
                                 setToast({open: true, message: 'Failed to create assessment', type: 'error'});
                              }
                            }
                          }}
                          disabled={creatingAssessment === student.id}
                        >
                          {creatingAssessment === student.id ? 'Creating Assessment...' : (hasAnyAssessment ? 'Resume Assessment' : 'Generate Assessment')}
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
        estimatedDuration={45000} // 45 seconds based on observed times
        onComplete={() => {
          // This will be called when the loading screen is hidden
          // The actual navigation happens in the API success handler
        }}
      />
      <Toast open={toast.open} onClose={() => setToast({open:false,message:''})} message={toast.message} type={toast.type}/>
      </div>
    </ErrorBoundary>
  );
} 