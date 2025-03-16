"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  EditIcon,
  MoreHorizontalIcon,
  ShieldIcon,
  TrashIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OWNER" | "WORKER";
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Token bulunamadı");
        }

        const response = await fetch("/api/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(
            data.error || "Kullanıcılar getirilirken bir hata oluştu"
          );
        }

        const data = await response.json();
        setUsers(data);
      } catch (err: any) {
        setError(err.message);
        toast({
          title: "Hata",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [toast]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-500/20 text-purple-400 border-purple-500/50";
      case "OWNER":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50";
      case "WORKER":
        return "bg-pink-500/20 text-pink-400 border-pink-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return status === "ACTIVE"
      ? "bg-green-500/20 text-green-400 border-green-500/50"
      : "bg-red-500/20 text-red-400 border-red-500/50";
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Admin";
      case "OWNER":
        return "Sahip";
      case "WORKER":
        return "İşçi";
      default:
        return role;
    }
  };

  const getStatusText = (status: string) => {
    return status === "ACTIVE" ? "Aktif" : "Pasif";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR");
  };

  if (isLoading) {
    return <div>Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-purple-500/30">
            <TableHead>Kullanıcı</TableHead>
            <TableHead>E-posta</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Kayıt Tarihi</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="border-purple-500/30">
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge className={`${getRoleBadgeColor(user.role)} border`}>
                  {getRoleText(user.role)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={`${getStatusBadgeColor(user.status)} border`}>
                  {getStatusText(user.status)}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(user.createdAt)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontalIcon className="h-4 w-4" />
                      <span className="sr-only">Menü</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-background/95 backdrop-blur-sm border-purple-500/30"
                  >
                    <DropdownMenuItem className="cursor-pointer">
                      <EditIcon className="mr-2 h-4 w-4" />
                      <span>Düzenle</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <ShieldIcon className="mr-2 h-4 w-4" />
                      <span>Rol Değiştir</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-destructive">
                      <TrashIcon className="mr-2 h-4 w-4" />
                      <span>Sil</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
