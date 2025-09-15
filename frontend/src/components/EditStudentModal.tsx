'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';

interface Student {
  id: number;
  name: string;
  gradeLevel: number;
  interests: string;
  birthday: string;
}

interface EditStudentModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentId: number, updatedData: Partial<Student>) => Promise<void>;
  onDelete: (studentId: number, studentName: string) => Promise<void>;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export default function EditStudentModal({
  student,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false
}: EditStudentModalProps) {
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form data when student changes
  React.useEffect(() => {
    if (student) {
      setFormData({
        name: student.name,
        gradeLevel: student.gradeLevel,
        interests: student.interests,
        birthday: student.birthday
      });
    }
    // Reset delete confirmation whenever switching students
    setShowDeleteConfirm(false);
  }, [student]);

  // Ensure the delete confirmation is closed whenever the modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleInputChange = (field: keyof Student, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!student) return;
    
    try {
      await onSave(student.id, formData);
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleDelete = async () => {
    if (!student) return;
    
    try {
      await onDelete(student.id, student.name);
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Student
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <FormInput
            label="Name"
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />

          <FormInput
            label="Grade Level"
            type="number"
            min="1"
            max="12"
            value={formData.gradeLevel || ''}
            onChange={(e) => handleInputChange('gradeLevel', parseInt(e.target.value))}
            required
          />

          <FormInput
            label="Birthday"
            type="date"
            value={formData.birthday || ''}
            onChange={(e) => handleInputChange('birthday', e.target.value)}
            required
          />

          <FormInput
            label="Interests (comma-separated)"
            type="text"
            value={formData.interests || ''}
            onChange={(e) => handleInputChange('interests', e.target.value)}
            placeholder="e.g., reading, sports, music"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {/* Save and Cancel */}
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
              disabled={isSaving || isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={isSaving || isDeleting}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {/* Delete Section */}
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving || isDeleting}
              className="w-full"
            >
              Delete Student
            </Button>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                Are you sure you want to delete {student.name}? This will also delete all their assessments and cannot be undone.
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                  disabled={isSaving || isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex-1"
                  disabled={isSaving || isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Student'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 