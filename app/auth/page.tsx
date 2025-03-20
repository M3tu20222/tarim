"use client";

import type React from "react";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserIcon, LockIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "Kullanıcı adı veya şifre hatalı!");
    } finally {
      setIsLoading(false);
    }
  };

  // Demo kullanıcı bilgilerini doldur
  const fillDemoUser = (role: string) => {
    if (role === "admin") {
      setUsername("admin@example.com");
      setPassword("admin123");
    } else if (role === "owner") {
      setUsername("owner@example.com");
      setPassword("owner123");
    } else if (role === "worker") {
      setUsername("worker@example.com");
      setPassword("worker123");
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative w-24 h-24 mb-4">
          <Image
            src="/placeholder.svg?height=96&width=96"
            alt="Logo"
            width={96}
            height={96}
            className="object-contain"
          />
          <div className="absolute inset-0 rounded-full neon-glow-cyan opacity-70"></div>
        </div>
        <h1 className="text-3xl font-bold neon-text-purple mb-2">
          Tarım Yönetim Sistemi
        </h1>
        <p className="text-muted-foreground">
          Tarım işletmenizi yönetmek için giriş yapın
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/20 to-cyan-500/20 blur-lg"></div>
        <div className="relative bg-black/80 backdrop-blur-sm p-6 rounded-lg border border-purple-500/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-sm font-medium text-foreground"
              >
                Kullanıcı Adı / E-posta
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="username"
                  type="text"
                  placeholder="Kullanıcı adınızı veya e-postanızı girin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-background/50 border-purple-500/30 focus:border-purple-500 focus:neon-glow"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Şifre
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <LockIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Şifrenizi girin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-background/50 border-purple-500/30 focus:border-purple-500 focus:neon-glow"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 animate-pulse">{error}</div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 transition-all duration-300 neon-glow"
                disabled={isLoading}
              >
                {isLoading ? "Giriş Yapılıyor..." : "Giriş Yap"}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground mt-4">
              <p className="text-center">Demo Kullanıcılar:</p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div
                  className="text-center p-1 rounded bg-purple-500/10 cursor-pointer hover:bg-purple-500/20 transition-colors"
                  onClick={() => fillDemoUser("admin")}
                >
                  <p className="font-medium">Admin</p>
                  <p>admin@example.com</p>
                </div>
                <div
                  className="text-center p-1 rounded bg-cyan-500/10 cursor-pointer hover:bg-cyan-500/20 transition-colors"
                  onClick={() => fillDemoUser("owner")}
                >
                  <p className="font-medium">Sahip</p>
                  <p>owner@example.com</p>
                </div>
                <div
                  className="text-center p-1 rounded bg-pink-500/10 cursor-pointer hover:bg-pink-500/20 transition-colors"
                  onClick={() => fillDemoUser("worker")}
                >
                  <p className="font-medium">İşçi</p>
                  <p>worker@example.com</p>
                </div>
              </div>
              <p className="text-center mt-2">
                Tüm şifreler: admin123, owner123, worker123
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
