import { LoginForm } from "@/components/login-form"
import Image from "next/image"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 cyberpunk-grid">
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
          <h1 className="text-3xl font-bold neon-text-purple mb-2">Tarım Yönetim Sistemi</h1>
          <p className="text-muted-foreground">Tarım işletmenizi yönetmek için giriş yapın</p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/20 to-cyan-500/20 blur-lg"></div>
          <div className="relative bg-black/80 backdrop-blur-sm p-6 rounded-lg border border-purple-500/50">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  )
}

