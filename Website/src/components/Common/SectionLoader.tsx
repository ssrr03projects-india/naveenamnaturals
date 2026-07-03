"use client";

import React from "react";

interface SectionLoaderProps {
  label?: string;
}

const SectionLoader: React.FC<SectionLoaderProps> = ({ label = "Loading..." }) => {
  return (
    <div
      className="container mx-auto px-4 py-20 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-success" />
      <p className="mt-4 text-secondary">{label}</p>
    </div>
  );
};

export default SectionLoader;
