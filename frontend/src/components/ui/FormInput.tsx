import React from 'react';

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function FormInput({ label, id, ...props }: FormInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="mt-1">
        <input
          id={id}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          {...props}
        />
      </div>
    </div>
  );
} 