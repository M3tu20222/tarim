"use client";

// İlgili importlar...

import { InventorySelector } from "@/components/inventory/inventory-selector";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "İsim en az 2 karakter olmalıdır.",
  }),
});

export function ProcessingForm() {
  // Form state ve diğer kodlar...
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(
    null
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  // Form gönderme işlemi...

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Diğer form alanları... */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>İsim</FormLabel>
              <FormControl>
                <Input placeholder="İsim" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <InventorySelector
          onSelect={(id) => setSelectedInventoryId(id)}
          label="Kullanılacak Envanter"
          required={true}
        />

        {/* Diğer form alanları... */}

        <Button type="submit">Kaydet</Button>
      </form>
    </Form>
  );
}
