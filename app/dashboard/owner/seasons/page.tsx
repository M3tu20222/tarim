// app/dashboard/owner/seasons/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { SeasonList } from "@/components/seasons/season-list"; // SeasonList'i import edin
import { Suspense } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function SeasonsPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Sezonlar</h1>
        <Button asChild>
          <Link href="/dashboard/owner/seasons/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Yeni Sezon
          </Link>
        </Button>
      </div>

      <Suspense fallback={<SeasonListSkeleton />}>
        <SeasonList />
      </Suspense>
    </div>
  );
}

function SeasonListSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-5 w-20" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-5 w-32" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-5 w-32" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-5 w-16" />
            </TableHead>
            <TableHead className="text-right">
              <Skeleton className="h-5 w-16" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-6 w-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-full" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-6 w-12" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
