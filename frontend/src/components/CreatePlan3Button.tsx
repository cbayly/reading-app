import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { createPlan3, pollPlan3Status } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';

interface CreatePlan3ButtonProps {
  studentId: number;
  studentName: string;
  className?: string;
}

const CreatePlan3Button: React.FC<CreatePlan3ButtonProps> = ({
  studentId,
  studentName,
  className = ''
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{open: boolean; message: string; type?: 'success'|'error'|'info'}>({open: false, message: ''});
  const router = useRouter();

  const handleCreatePlan3 = async () => {
    setIsCreating(true);
    setToast({ open: false, message: '' });

    try {
      // Generate a theme based on student interests (you can enhance this)
      const theme = `${studentName}'s Adventure`;
      const name = `${studentName}'s 3-Day Reading Plan`;

      // Start plan creation (returns immediately with stub)
      const response = await createPlan3(studentId, name, theme);
      
      if (response && response.plan && response.plan.id) {
        setToast({
          open: true,
          message: 'Starting plan generation...',
          type: 'info'
        });

        // Poll for plan completion
        try {
          const completedPlan = await pollPlan3Status(studentId);
          
          setToast({
            open: true,
            message: '3-day reading plan created successfully!',
            type: 'success'
          });

          // Navigate to the Plan3 page
          setTimeout(() => {
            router.push(`/plan3/${studentId}`);
          }, 1000);
          
        } catch (pollError: any) {
          console.error('Error polling for plan completion:', pollError);
          setToast({
            open: true,
            message: pollError.message || 'Plan generation failed. Please try again.',
            type: 'error'
          });
        }
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error: any) {
      console.error('Error creating 3-day plan:', error);
      
      let errorMessage = 'Failed to create 3-day reading plan. Please try again.';
      
      // Provide more specific error messages
      if (error.response?.status === 429) {
        errorMessage = 'Rate limited. Please try again in a moment.';
      } else if (error.response?.status === 502) {
        errorMessage = 'AI service temporarily unavailable. Please try again.';
      } else if (error.response?.status === 503) {
        errorMessage = 'Server busy. Please try again in a moment.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setToast({
        open: true,
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleCreatePlan3}
        disabled={isCreating}
        className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
      >
        {isCreating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Creating...
          </>
        ) : (
          'Create 3-Day Plan'
        )}
      </Button>

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ open: false, message: '' })}
      />
    </>
  );
};

export default CreatePlan3Button;
