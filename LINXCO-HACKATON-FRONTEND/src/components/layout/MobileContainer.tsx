import React from 'react';

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className="min-h-screen w-full bg-[#F8FAF6] text-charcoal-900 flex flex-col">
      <div
        className={`w-full max-w-[1840px] mx-auto min-h-screen px-4 sm:px-8 lg:px-14 2xl:px-20 pb-12 flex flex-col ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
