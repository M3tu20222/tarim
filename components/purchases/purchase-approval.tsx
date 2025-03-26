"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Check, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { ApprovalStatus } from "@prisma/client";

// Form şeması
const formSchema = z.object({
  comment: z.string().optional(),
});

interface PurchaseApprovalProps {
  purchase: {
    id: string;
    product: string;
    totalCost: number;
    approvalStatus: ApprovalStatus;
    approvals: {
      id: string;
      status: ApprovalStatus;
      comment: string | null;
      approvedAt: string | null;
      approver: {
        id: string;
        name: string;
      };
    }[];
  };
}

export function PurchaseApproval({ purchase }: PurchaseApprovalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Form tanımı
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
    },
  });

  // Onay durumu rengini belirle
  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-500/10 text-green-500 border-green-500";
      case "REJECTED":
        return "bg-red-500/10 text-red-500 border-red-500";
      case "CANCELLED":
        return "bg-gray-500/10 text-gray-500 border-gray-500";
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500";
    }
  };

  // Onay durumu metnini belirle
  const getStatusText = (status: ApprovalStatus) => {
    switch (status) {
      case "APPROVED":
        return "Onaylandı";
      case "REJECTED":
        return "Reddedildi";
      case "CANCELLED":
        return "İptal Edildi";
      default:
        return "Onay Bekliyor";
    }
  };

  // Onay işlemi
  const handleApprove = async (values: z.infer<typeof formSchema>) => {
    setIsApproving(true);
    try {
      const response = await fetch(`/api/purchases/${purchase.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "APPROVED",
          comment: values.comment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Alış onaylanırken bir hata oluştu");
      }

      toast({
        title: "Başarılı!",
        description: "Alış başarıyla onaylandı.",
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error approving purchase:", error);
      toast({
        title: "Hata!",
        description: error.message || "Alış onaylanırken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Reddetme işlemi
  const handleReject = async (values: z.infer<typeof formSchema>) => {
    setIsRejecting(true);
    try {
      const response = await fetch(`/api/purchases/${purchase.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "REJECTED",
          comment: values.comment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Alış reddedilirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı!",
        description: "Alış başarıyla reddedildi.",
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error rejecting purchase:", error);
      toast({
        title: "Hata!",
        description: error.message || "Alış reddedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Alış Onayı</CardTitle>
          <Badge
            variant="outline"
            className={getStatusColor(purchase.approvalStatus)}
          >
            {getStatusText(purchase.approvalStatus)}
          </Badge>
        </div>
        <CardDescription>
          {purchase.product} - {formatCurrency(purchase.totalCost)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yorum</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Onay veya red için açıklama ekleyin..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {purchase.approvals.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium">Onay Geçmişi</h3>
                <div className="space-y-2">
                  {purchase.approvals.map((approval) => (
                    <div key={approval.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {approval.approver.name}
                        </div>
                        <Badge
                          variant="outline"
                          className={getStatusColor(approval.status)}
                        >
                          {getStatusText(approval.status)}
                        </Badge>
                      </div>
                      {approval.comment && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {approval.comment}
                        </p>
                      )}
                      {approval.approvedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(approval.approvedAt).toLocaleString(
                            "tr-TR"
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="destructive"
          onClick={form.handleSubmit(handleReject)}
          disabled={
            isApproving || isRejecting || purchase.approvalStatus !== "PENDING"
          }
        >
          {isRejecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Reddediliyor...
            </>
          ) : (
            <>
              <X className="mr-2 h-4 w-4" />
              Reddet
            </>
          )}
        </Button>
        <Button
          variant="default"
          onClick={form.handleSubmit(handleApprove)}
          disabled={
            isApproving || isRejecting || purchase.approvalStatus !== "PENDING"
          }
        >
          {isApproving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Onaylanıyor...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Onayla
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
