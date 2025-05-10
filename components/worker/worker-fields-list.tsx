"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Leaf, User } from "lucide-react";

interface WorkerFieldsListProps {
  fields: any[];
}

export function WorkerFieldsList({ fields }: WorkerFieldsListProps) {
  if (fields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tarlalar</CardTitle>
          <CardDescription>Atanmış kuyuya bağlı tarlalar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <p>Atanmış kuyuya bağlı tarla bulunmamaktadır.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarlalar</CardTitle>
        <CardDescription>Atanmış kuyuya bağlı tarlalar</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex justify-between items-center border-b pb-3"
            >
              <div>
                <h3 className="font-medium">{field.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{field.size} dekar</Badge>
                  {field.crops && field.crops.length > 0 && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Leaf className="h-3 w-3 mr-1" />
                      {field.crops[0].name}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {field.owners &&
                    field.owners.map((owner: any) => (
                      <div
                        key={owner.userId}
                        className="flex items-center text-xs text-muted-foreground"
                      >
                        <User className="h-3 w-3 mr-1" />
                        {owner.user.name} ({owner.percentage}%)
                      </div>
                    ))}
                </div>
              </div>
              <Link href={`/dashboard/worker/fields/${field.id}`}>
                <Button variant="ghost" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
