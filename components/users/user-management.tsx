"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { UserTable } from "@/components/users/user-table";
import { AddUserDialog } from "@/components/users/add-user-dialog";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import { DeleteUserDialog } from "@/components/users/delete-user-dialog";
import type { UserFormData } from "@/types/user-form-data";

export function UserManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserFormData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddUser = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditUser = (user: UserFormData) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: UserFormData) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleUserAdded = () => {
    setIsAddDialogOpen(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleUserEdited = () => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleUserDeleted = () => {
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleAddUser}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
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
