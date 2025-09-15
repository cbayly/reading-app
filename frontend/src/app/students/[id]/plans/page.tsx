'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import Link from 'next/link';
import api from '@/lib/api';

interface Plan3 {
  id: number;
  name: string;
  theme: string;
  status: 'active' | 'completed' | 'generating';
  createdAt: string;
  completedAt?: string;
  days: Array<{
    id: number;
    index: number;
    state: 'available' | 'locked' | 'complete';
    completedAt?: string;
  }>;
  story?: {
    id: string;
    title: string;
    themes: string[];
    part1: string;
    part2: string;
    part3: string;
    createdAt: string;
  };
}

interface Student {
  id: number;
  name: string;
  gradeLevel: number;
  assessments: Array<{
    id: number;
    status: string;
    createdAt: string;
    completedAt?: string;
  }>;
}

export default function StudentPlansPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [plans, setPlans] = useState<Plan3[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPlanId, setDeletingPlanId] = useState<number | null>(null);
  const [toast, setToast] = useState<{open: boolean; message: string; type?: 'success'|'error'|'info'}>({open: false, message: ''});

  const studentId = params.id as string;

  useEffect(() => {
    if (!authLoading && user) {
      fetchStudentAndPlans();
    }
  }, [authLoading, user, studentId]);

  const fetchStudentAndPlans = async () => {
    try {
      setLoading(true);
      
      // Fetch student details and plans in parallel
      const [studentResponse, plansResponse] = await Promise.all([
        api.get(`/students/${studentId}`),
        api.get(`/students/${studentId}/plans`)
      ]);
      
      setStudent(studentResponse.data);
      
      // Sort by creation date (newest first)
      const sortedPlans = plansResponse.data.sort((a: Plan3, b: Plan3) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setPlans(sortedPlans);
      
    } catch (error: any) {
      console.error('Error fetching student and plans:', error);
      setToast({
        open: true,
        message: error.response?.data?.message || error.message || 'Failed to load student plans',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: number, planName: string) => {
    if (!confirm(`Delete "${planName}"? This cannot be undone.`)) return;
    
    try {
      setDeletingPlanId(planId);
      
      await api.delete(`/plan3/${planId}`);
      
      setToast({
        open: true,
        message: 'Plan deleted successfully',
        type: 'success'
      });
      
      // Remove the plan from the list
      setPlans(prev => prev.filter(plan => plan.id !== planId));
      
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      setToast({
        open: true,
        message: error.response?.data?.message || error.message || 'Failed to delete plan',
        type: 'error'
      });
    } finally {
      setDeletingPlanId(null);
    }
  };

  const getPlanStatus = (plan: Plan3) => {
    if (plan.status === 'generating') return 'generating';
    if (plan.status === 'completed') return 'completed';
    
    // Check if all days are complete
    const allDaysComplete = plan.days.every(day => day.state === 'complete');
    return allDaysComplete ? 'completed' : 'active';
  };

  const getCompletedDaysCount = (plan: Plan3) => {
    return plan.days.filter(day => day.state === 'complete').length;
  };

  const getCompletionInfo = (plan: Plan3) => {
    if (plan.status !== 'completed' && !plan.days.every(day => day.state === 'complete')) {
      return null;
    }

    // Find the completion date (use the latest completed day's completion date)
    const completedDays = plan.days.filter(day => day.state === 'complete' && day.completedAt);
    if (completedDays.length === 0) return null;

    const latestCompletion = completedDays.reduce((latest, day) => {
      const dayDate = new Date(day.completedAt!);
      const latestDate = new Date(latest.completedAt!);
      return dayDate > latestDate ? day : latest;
    });

    const completionDate = new Date(latestCompletion.completedAt!);
    const startDate = new Date(plan.createdAt);
    
    // Calculate days between start and completion
    const timeDiff = completionDate.getTime() - startDate.getTime();
    const daysToComplete = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return {
      completionDate,
      daysToComplete
    };
  };

  const getAssessmentInfo = (student: Student) => {
    if (!student.assessments || student.assessments.length === 0) {
      return null;
    }

    const latestAssessment = student.assessments[0];
    const isCompleted = latestAssessment.status === 'completed';
    
    return {
      assessment: latestAssessment,
      isCompleted,
      statusText: isCompleted ? 'Completed' : 'In Progress',
      statusColor: isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
    };
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
        return {
          card: 'bg-blue-50 border-blue-200 hover:shadow-md transition-all duration-200',
          status: 'bg-blue-100 text-blue-800',
          icon: 'text-blue-600'
        };
      case 'completed':
        return {
          card: 'bg-gray-100 border-gray-300',
          status: 'bg-green-100 text-green-800',
          icon: 'text-gray-400'
        };
      case 'generating':
        return {
          card: 'bg-yellow-50 border-yellow-200',
          status: 'bg-yellow-100 text-yellow-800',
          icon: 'text-yellow-600'
        };
      default:
        return {
          card: 'bg-gray-50 border-gray-200',
          status: 'bg-gray-100 text-gray-800',
          icon: 'text-gray-600'
        };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'completed': return 'Complete';
      case 'generating': return 'Generating';
      default: return 'Unknown';
    }
  };

  const getPlanIcon = (status: string) => {
    switch (status) {
      case 'active': return '📚';
      case 'completed': return '📖';
      case 'generating': return '⏳';
      default: return '📖';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student plans...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Student Not Found</h1>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {student.name}'s Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Grade {student.gradeLevel} • {plans.length} plan{plans.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="secondary">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Assessment and Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Assessment Card */}
          {student && (() => {
            const assessmentInfo = getAssessmentInfo(student);
            if (!assessmentInfo) return null;
            
            return (
              <div className="border-2 rounded-lg p-6 bg-blue-50 border-blue-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">📊</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${assessmentInfo.statusColor}`}>
                    {assessmentInfo.statusText}
                  </span>
                </div>

                {/* Assessment Info */}
                <div className="mb-4">
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">
                    Reading Assessment
                  </h3>
                  <p className="text-sm text-gray-600">
                    Grade {student.gradeLevel} Reading Level
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {assessmentInfo.isCompleted ? (
                    <Button
                      className="w-full"
                      onClick={() => router.push(`/assessment/${assessmentInfo.assessment.id}/results`)}
                    >
                      View Results
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => router.push(`/assessment/${assessmentInfo.assessment.id}/intro`)}
                    >
                      Continue Assessment
                    </Button>
                  )}
                </div>

                {/* Date */}
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p 
                    className="text-xs text-gray-500"
                    title={`Created: ${new Date(assessmentInfo.assessment.createdAt).toLocaleDateString()}${assessmentInfo.assessment.completedAt ? `\nCompleted: ${new Date(assessmentInfo.assessment.completedAt).toLocaleDateString()}` : ''}`}
                  >
                    {assessmentInfo.isCompleted ? 'Completed' : 'Started'}: {new Date(assessmentInfo.assessment.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Plans */}
          {plans.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Plans Yet</h3>
              <p className="text-gray-600 mb-6">
                {student?.name} doesn't have any reading plans yet.
              </p>
              <Link href="/dashboard">
                <Button>Create First Plan</Button>
              </Link>
            </div>
          ) : (
            <>
            {plans.map((plan) => {
              const status = getPlanStatus(plan);
              const styles = getStatusStyles(status);
              const completedDays = getCompletedDaysCount(plan);
              const totalDays = plan.days.length;
              const progressPercentage = Math.round((completedDays / totalDays) * 100);
              const completionInfo = getCompletionInfo(plan);

              return (
                <div key={plan.id} className={`border-2 rounded-lg p-6 ${styles.card}`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{getPlanIcon(status)}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${styles.status}`}>
                      {getStatusText(status)}
                    </span>
                  </div>

                  {/* Plan Info */}
                  <div className="mb-4">
                    <h3 className={`font-semibold text-lg mb-2 ${status === 'completed' ? 'text-gray-500' : 'text-gray-900'}`}>
                      {plan.story?.title || plan.theme}
                    </h3>
                    <p className={`text-sm ${status === 'completed' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {plan.name}
                    </p>
                  </div>

                  {/* Progress */}
                  {status !== 'generating' && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className={status === 'completed' ? 'text-gray-400' : 'text-gray-600'}>
                          Progress
                        </span>
                        <span className={status === 'completed' ? 'text-gray-400' : 'text-gray-600'}>
                          {progressPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      <p className={`text-xs mt-1 ${status === 'completed' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {completedDays} of {totalDays} days completed
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    {status === 'active' && (
                      <Button
                        className="w-full"
                        onClick={() => router.push(`/plan3/${plan.id}`)}
                      >
                        Continue Reading
                      </Button>
                    )}
                    
                    {status === 'completed' && (
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => router.push(`/plan3/${plan.id}`)}
                      >
                        View Plan
                      </Button>
                    )}
                    
                    {status === 'generating' && (
                      <div className="text-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mx-auto mb-2"></div>
                        <p className="text-sm text-yellow-600">Generating...</p>
                      </div>
                    )}
                    
                    <button
                      className={`w-full inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm ${
                        deletingPlanId === plan.id 
                          ? 'border-red-100 text-red-300' 
                          : 'border-red-200 text-red-700 hover:bg-red-50'
                      }`}
                      disabled={deletingPlanId === plan.id}
                      onClick={() => handleDeletePlan(plan.id, plan.name)}
                    >
                      {deletingPlanId === plan.id ? 'Deleting…' : 'Delete Plan'}
                    </button>
                  </div>

                  {/* Duration */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {completionInfo ? (
                      <p 
                        className="text-xs text-gray-500"
                        title={`Created: ${new Date(plan.createdAt).toLocaleDateString()}\nCompleted: ${completionInfo.completionDate.toLocaleDateString()}`}
                      >
                        Completed in {completionInfo.daysToComplete} day{completionInfo.daysToComplete !== 1 ? 's' : ''}
                      </p>
                    ) : (
                      <p 
                        className={`text-xs ${status === 'completed' ? 'text-gray-400' : 'text-gray-500'}`}
                        title={`Created: ${new Date(plan.createdAt).toLocaleDateString()}`}
                      >
                        Created: {new Date(plan.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ open: false, message: '' })}
      />
    </div>
  );
}
