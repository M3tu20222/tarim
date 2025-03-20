"use client";

"use client";

import type React from "react";
import { redirect } from 'next/navigation'
import { useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedPageProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedPage({ children, allowedRoles }: ProtectedPageProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-4 p-8">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    redirect("/");
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    redirect(`/dashboard/${user.role.toLowerCase()}`);
  }

  return <>{children}</>;
}
