"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2Icon, Trash2Icon } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

import type { UserFormData } from "@/types/user-form-data";

interface UserTableProps {
  refreshTrigger?: number;
  onEditUser?: (user: UserFormData) => void;
  onDeleteUser?: (user: UserFormData) => void;
}

export function UserTable({
  refreshTrigger = 0,
  onEditUser,
  onDeleteUser,
}: UserTableProps) {
  const [users, setUsers] = useState<UserFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/users", {
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Kullanıcılar yüklenirken bir hata oluştu"
          );
        }

        const data = await response.json();
        // Convert API response to UserFormData
        const users = data.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt
        }));
        setUsers(users);
      } catch (err: any) {
        console.error("Kullanıcılar yüklenirken hata:", err);
        setError(err.message);
        toast({
          title: "Hata",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [refreshTrigger, toast]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <Badge className="bg-purple-600 hover:bg-purple-700">Admin</Badge>
        );
      case "OWNER":
        return <Badge className="bg-blue-600 hover:bg-blue-700">Sahip</Badge>;
      case "WORKER":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">Çalışan</Badge>
        );
      default:
        return <Badge>{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-600 hover:bg-green-700">Aktif</Badge>;
      case "INACTIVE":
        return <Badge className="bg-red-600 hover:bg-red-700">Pasif</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Yeniden Dene
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ad Soyad</TableHead>
            <TableHead>E-posta</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Kayıt Tarihi</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                Henüz kullanıcı bulunmuyor
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getRoleBadge(user.role)}</TableCell>
                <TableCell>
                  {user.status ? getStatusBadge(user.status) : "-"}
                </TableCell>
                <TableCell>
                  {user.createdAt
                    ? format(new Date(user.createdAt), "dd MMMM yyyy", {
                        locale: tr,
                      })
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {onEditUser && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onEditUser(user)}
                      >
                        <Edit2Icon className="h-4 w-4" />
                      </Button>
                    )}
                    {onDeleteUser && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => onDeleteUser(user)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
