"use client";

import React, { Suspense } from "react";
import PageLoader from "./PageLoader";

const PageLoaderWrapper: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <PageLoader />
    </Suspense>
  );
};

export default PageLoaderWrapper;
