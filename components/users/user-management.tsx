"use client";

import { useState } from "react";
import { UserTable } from "./user-table";
import { AddUserDialog } from "./add-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { User } from "@prisma/client";


export function UserManagement() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();

  const handleAddUser = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleUserAdded = () => {
    setIsAddDialogOpen(false);
    setRefreshTrigger((prev) => prev + 1);
    toast({
      title: "Kullanıcı Eklendi",
      description: "Yeni kullanıcı başarıyla eklendi.",
    });
  };

  const handleUserEdited = () => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    setRefreshTrigger((prev) => prev + 1);
    toast({
      title: "Kullanıcı Güncellendi",
      description: "Kullanıcı bilgileri başarıyla güncellendi.",
    });
  };

  const handleUserDeleted = () => {
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
    setRefreshTrigger((prev) => prev + 1);
    toast({
      title: "Kullanıcı Silindi",
      description: "Kullanıcı başarıyla silindi.",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleAddUser}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </div>

      <UserTable
        refreshTrigger={refreshTrigger}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
      />

      <AddUserDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onUserAdded={handleUserAdded}
      />

      {selectedUser && (
        <>
          <EditUserDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            user={selectedUser}
            onUserEdited={handleUserEdited}
          />

          <DeleteUserDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            user={selectedUser}
            onUserDeleted={handleUserDeleted}
          />
        </>
      )}
    </div>
  );
}
