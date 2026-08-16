import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium tracking-[0.2em] text-primary uppercase">
            Jugadu Cafe
          </p>
          <h1 className="mt-2 text-2xl font-bold">Admin Login</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to manage gallery & highlights
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
