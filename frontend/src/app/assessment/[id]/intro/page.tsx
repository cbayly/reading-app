'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Assessment } from '@/types/assessment';

export default function AssessmentIntroPage() {
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

  const handleStart = () => {
    if (assessment) {
      router.push(`/assessment/${assessment.id}/read`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessment...</p>
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

  if (!assessment || !assessment.student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Assessment Not Found</h2>
          <p className="text-gray-600 mb-4">The assessment could not be loaded.</p>
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

  const firstName = assessment?.student?.name?.split(' ')[0] || assessment.student.name;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-3xl w-full">
        <h1 className="text-4xl font-bold text-center mb-4">
          Ready for {firstName}&apos;s Reading Assessment?
        </h1>
        <p className="text-xl text-gray-600 text-center mb-12">
          Let&apos;s discover {firstName}&apos;s reading level and create a personalized learning plan.
        </p>

        <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-bold mb-8">What to Expect</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="text-center">
              <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📖</span>
              </div>
              <h3 className="font-semibold mb-2">Personalized Passage</h3>
              <p className="text-gray-600">
                {firstName} will read a passage tailored to their interests and reading level.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏱️</span>
              </div>
              <h3 className="font-semibold mb-2">Timed Reading</h3>
              <p className="text-gray-600">
                We&apos;ll measure reading speed and accuracy to understand their current level.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold mb-2">Detailed Results</h3>
              <p className="text-gray-600">
                Get comprehensive insights into {firstName}&apos;s reading strengths and areas for growth.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="flex items-center text-lg font-semibold text-blue-900 mb-4">
              <span className="mr-2">💡</span>
              Tips for Success
            </h3>
            <ul className="space-y-3 text-blue-800">
              <li>• Find a quiet, comfortable space for {firstName}</li>
              <li>• Make sure they&apos;re well-rested and relaxed</li>
              <li>• Encourage them to read naturally, as they normally would</li>
              <li>• The assessment takes about 5-10 minutes to complete</li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleStart}
            className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Reading Assessment
          </button>
          <p className="mt-4 text-gray-600">
            You can always come back to this later if you&apos;re not ready right now.
          </p>
        </div>
      </div>
    </div>
  );
}