'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { createAssessment } from '@/lib/api';
import api from '@/lib/api';
import AssessmentLoadingScreen from '@/components/AssessmentLoadingScreen';

interface StudentData {
  name: string;
  birthday: string;
  gradeLevel: number;
  interests: string;
}

export function StudentForm() {
  const [step, setStep] = useState(1);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [currentStudent, setCurrentStudent] = useState<StudentData>({
    name: '',
    birthday: '',
    gradeLevel: 1,
    interests: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStudentId, setNewStudentId] = useState<number | null>(null);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingStudentName, setLoadingStudentName] = useState('');
  const [createdAssessmentId, setCreatedAssessmentId] = useState<number | null>(null);
  const router = useRouter();

  // Calculate grade level based on birthday
  const calculateGradeLevel = (birthday: string): number => {
    if (!birthday) return 1;
    
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    
    // Adjust for birth month
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Calculate grade level (typically start kindergarten at age 5)
    let gradeLevel = age - 4; // 5 years old = kindergarten = grade 0, but we use 1-12
    
    // Clamp to valid range
    if (gradeLevel < 1) gradeLevel = 1;
    if (gradeLevel > 12) gradeLevel = 12;
    
    return gradeLevel;
  };

  // Auto-populate grade when birthday changes
  useEffect(() => {
    if (currentStudent.birthday) {
      const calculatedGrade = calculateGradeLevel(currentStudent.birthday);
      setCurrentStudent(prev => ({ ...prev, gradeLevel: calculatedGrade }));
    }
  }, [currentStudent.birthday]);

  // Cleanup effect to ensure loading screen is hidden when component unmounts
  useEffect(() => {
    return () => {
      setShowLoadingScreen(false);
      setIsSubmitting(false);
      setCreatedAssessmentId(null);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      // Call API to create the current student
      const response = await api.post('/students', {
        name: currentStudent.name,
        birthday: currentStudent.birthday,
        gradeLevel: currentStudent.gradeLevel,
        interests: currentStudent.interests,
      });

      console.log('Student created:', response.data);
      setNewStudentId(response.data.id);

      // Add current student to the list
      const updatedStudents = [...students, currentStudent];
      setStudents(updatedStudents);

      // Move to the "add another child" step
      setStep(4);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAnotherChild = () => {
    // Reset current student data
    setCurrentStudent({
      name: '',
      birthday: '',
      gradeLevel: 1,
      interests: '',
    });
    setStep(1);
  };

  const completeSetup = async () => {
    if (!newStudentId) {
      setError('Could not find the new student to start the assessment.');
      return;
    }
    
    // Prevent multiple clicks
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      setLoadingStudentName(currentStudent.name);
      setShowLoadingScreen(true);
      const response = await createAssessment(newStudentId);
      console.log('API response:', response);
      
      // Handle different response structures
      const assessment = response.assessment || response;
      console.log('Assessment object:', assessment);
      
      if (!assessment || !assessment.id) {
        throw new Error('Invalid assessment response from server');
      }
      
      setCreatedAssessmentId(assessment.id);
      // Loading screen will handle the transition
    } catch (err) {
      setShowLoadingScreen(false);
      setIsSubmitting(false);
      setCreatedAssessmentId(null);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create assessment.');
      }
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const updateCurrentStudent = (field: keyof StudentData, value: string | number) => {
    setCurrentStudent(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      {step <= 3 && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-4 ${
              step >= 2 ? 'bg-blue-600' : 'bg-gray-200'
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <div className={`flex-1 h-1 mx-4 ${
              step >= 3 ? 'bg-blue-600' : 'bg-gray-200'
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Basic Info</span>
            <span>Grade Level</span>
            <span>Interests</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Let&apos;s start with the basics</h2>
            <FormInput
              label="Child's Name"
              id="name"
              type="text"
              value={currentStudent.name}
              onChange={(e) => updateCurrentStudent('name', e.target.value)}
              required
            />
            <FormInput
              label="Birthday"
              id="birthday"
              type="date"
              value={currentStudent.birthday}
              onChange={(e) => updateCurrentStudent('birthday', e.target.value)}
              required
            />
            <div className="flex justify-end">
              <Button type="button" onClick={nextStep} disabled={!currentStudent.name || !currentStudent.birthday}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">What grade is your child in?</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We&apos;ve automatically calculated this based on your child&apos;s birthday, but you can adjust it if needed.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grade Level
              </label>
              <select
                value={currentStudent.gradeLevel}
                onChange={(e) => updateCurrentStudent('gradeLevel', parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="secondary" onClick={prevStep}>
                Back
              </Button>
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">What interests your child?</h2>
            <p className="text-gray-600 dark:text-gray-400">
              This helps us create personalized reading passages for your child.
            </p>
            <FormInput
              label="Interests (comma-separated)"
              id="interests"
              type="text"
              placeholder="e.g., dinosaurs, space, sports, animals"
              value={currentStudent.interests}
              onChange={(e) => updateCurrentStudent('interests', e.target.value)}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-between">
              <Button type="button" variant="secondary" onClick={prevStep}>
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Complete Setup'}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold">Great! {currentStudent.name} is all set up.</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Would you like to add another child to your account?
            </p>
            <div className="flex justify-center space-x-4">
              <Button type="button" variant="secondary" onClick={addAnotherChild}>
                Add Another Child
              </Button>
              <Button type="button" onClick={completeSetup} disabled={isSubmitting}>
                {isSubmitting ? 'Starting Assessment...' : 'Start Reading Assessment'}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Assessment Loading Screen */}
      <AssessmentLoadingScreen
        studentName={loadingStudentName}
        isVisible={showLoadingScreen}
        estimatedDuration={45000} // 45 seconds based on observed times
        onComplete={() => {
          setIsSubmitting(false);
          // Navigate to the assessment intro after loading completes
          if (createdAssessmentId) {
            console.log('Navigating to assessment intro:', createdAssessmentId);
            router.push(`/assessment/${createdAssessmentId}/intro`);
            setCreatedAssessmentId(null);
            // Keep loading screen visible until navigation completes
            // The loading screen will be hidden when the component unmounts
          } else {
            console.error('No assessment ID found for navigation');
            setError('Failed to create assessment. Please try again.');
            setShowLoadingScreen(false);
          }
        }}
      />
    </div>
  );
} 