import { NewFieldForm } from "@/components/fields/new-field-form";

export default function NewFieldPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Yeni Tarla Ekle</h1>
        <p className="text-muted-foreground">
          Çiftliğinize yeni bir tarla ekleyin.
        </p>
      </div>
      <div className="border rounded-lg p-6 bg-card">
        <NewFieldForm />
      </div>
    </div>
  );
}
