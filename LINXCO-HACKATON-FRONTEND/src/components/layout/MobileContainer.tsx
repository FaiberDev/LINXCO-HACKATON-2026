import React from 'react';
import { useLocation } from 'react-router-dom';

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({
  children,
  className = '',
}) => {
  const location = useLocation();
  const isAdminPanel = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex justify-center">
      <div
        className={`w-full ${
          isAdminPanel ? 'max-w-4xl' : 'max-w-md'
        } min-h-screen bg-white px-4 pb-20 shadow-md border-x border-slate-200 flex flex-col transition-all ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
