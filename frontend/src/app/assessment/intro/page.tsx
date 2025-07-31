'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { createAssessment } from '@/lib/api';
import { Assessment } from '@/types/assessment';

export default function AssessmentIntroPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumedAssessment, setResumedAssessment] = useState<Assessment | null>(null);
  const router = useRouter();

  const handleStartAssessment = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For now, we'll use the first student. In a real app, you'd let the parent choose which child
      const result = await createAssessment(1); // TODO: Get actual student ID
      console.log('Assessment result:', result);
      
      if (result.resumed) {
        // Show resumption message
        setResumedAssessment(result.assessment);
      } else {
        // Redirect to the assessment start page
        router.push('/assessment/start');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const continueAssessment = () => {
    if (resumedAssessment) {
      router.push('/assessment/start');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-8">
        {resumedAssessment ? (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome Back!
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              We found an assessment in progress. Would you like to continue where you left off?
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
              <p className="text-blue-800 dark:text-blue-200">
                Assessment started on: {new Date(resumedAssessment.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <Button variant="secondary" onClick={() => setResumedAssessment(null)}>
                Start New Assessment
              </Button>
              <Button onClick={continueAssessment}>
                Continue Assessment
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Ready for Your Child&apos;s Reading Assessment?
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Let&apos;s discover your child&apos;s reading level and create a personalized learning plan.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                What to Expect
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📖</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Personalized Passage</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your child will read a passage tailored to their interests and reading level.
                  </p>
                </div>
                
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⏱️</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Timed Reading</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    We&apos;ll measure reading speed and accuracy to understand their current level.
                  </p>
                </div>
                
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Detailed Results</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get comprehensive insights into your child&apos;s reading strengths and areas for growth.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  💡 Tips for Success
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Find a quiet, comfortable space for your child</li>
                  <li>• Make sure they&apos;re well-rested and relaxed</li>
                  <li>• Encourage them to read naturally, as they normally would</li>
                  <li>• The assessment takes about 5-10 minutes to complete</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              {error && <p className="text-red-500 mb-4">{error}</p>}
              <Button 
                className="text-lg px-8 py-4" 
                onClick={handleStartAssessment}
                disabled={isLoading}
              >
                {isLoading ? 'Starting...' : 'Start Reading Assessment'}
              </Button>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                You can always come back to this later if you&apos;re not ready right now.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
