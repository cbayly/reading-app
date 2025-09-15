'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Assessment } from '@/types/assessment';
import GenericSplitLayout from '@/components/layout/GenericSplitLayout';
import AssessmentReadingPane from '@/components/assessment/AssessmentReadingPane';

export default function AssessmentReadPage() {
  const params = useParams();
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const response = await api.get(`/assessments/${params.id}`);
        setAssessment(response.data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load assessment');
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAssessment();
    }
  }, [params.id]);

  const handleReadingComplete = (readingTime: number, errorCount: number) => {
    if (assessment) {
      // Save to localStorage as backup in case URL params get lost
      localStorage.setItem(`assessment_${assessment.id}_readingTime`, readingTime.toString());
      localStorage.setItem(`assessment_${assessment.id}_errorCount`, errorCount.toString());
      
      router.push(
        `/assessment/${assessment.id}/questions?readingTime=${readingTime}&errorCount=${errorCount}`
      );
    }
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your reading passage...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!assessment || !assessment.passage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">No Passage Found</h2>
          <p className="text-gray-600 mb-4">The reading passage could not be loaded.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const firstName = assessment?.student?.name?.split(' ')[0] || assessment?.student?.name || 'Student';

  return (
    <GenericSplitLayout
      readingContent={
        <AssessmentReadingPane
          passage={assessment.passage}
          studentName={firstName}
          onComplete={handleReadingComplete}
          showCompleteButton={true}
        />
      }
      activityContent={
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Complete the Reading First
            </h3>
            <p className="text-gray-600 text-sm">
              Please read the passage completely before answering the questions. This helps ensure accurate assessment of {firstName}'s reading comprehension.
            </p>
          </div>
        </div>
      }
      title="Reading Assessment"
      subtitle={firstName}
      onBack={handleBack}
      defaultView="reading"
      printConfig={{
        readingPrintable: true,
        activitiesPrintable: false
      }}
      splitConfig={{
        defaultSplitValue: 0.7, // Give more space to reading
        minLeftWidth: 500,
        minRightWidth: 300,
        showDivider: true
      }}
    />
  );
} 