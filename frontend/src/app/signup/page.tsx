import { SignUpForm } from '../../components/forms/SignUpForm';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            And start your child's reading journey today.
          </p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
} 