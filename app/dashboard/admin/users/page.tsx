import { ProtectedPage } from "@/components/protected-page";
import { UserManagement } from "@/components/users/user-management";

export default function AdminUsersPage() {
  return (
    <ProtectedPage allowedRoles={["ADMIN"]}>
      <div className="p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight neon-text-purple">
            Kullanıcı Yönetimi
          </h1>
          <p className="text-muted-foreground">
            Sistem kullanıcılarını yönetin, ekleyin, düzenleyin veya silin
          </p>
        </div>

        <UserManagement />
      </div>
    </ProtectedPage>
  );
}
