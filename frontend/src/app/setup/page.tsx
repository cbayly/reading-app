import { StudentForm } from '@/components/forms/StudentForm';

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Set Up Your Child&apos;s Profile
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Let&apos;s get to know your child so we can create the perfect reading experience.
          </p>
        </div>
        <StudentForm />
      </div>
    </div>
  );
} 