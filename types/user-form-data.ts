export type UserFormData = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OWNER" | "WORKER";
  status: "ACTIVE" | "INACTIVE";
  createdAt: string | Date;
};
