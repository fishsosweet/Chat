import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authStore } from "@/features/auth/store/auth.store";
import { ThemeToggle } from "@/features/shared/theme-toggle";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8)
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = authStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (values: LoginForm) => {
    try {
      await login(values);
      navigate("/chat");
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Could not login"
      });
    }
  };

  return (
    <div className="auth-background grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">ChatRealtime</span>
            <ThemeToggle />
          </div>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Login to continue your realtime conversations.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <Input placeholder="Email" type="email" {...register("email")} />
              {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}
            </div>

            <div className="space-y-1">
              <Input placeholder="Password" type="password" {...register("password")} />
              {errors.password ? <p className="text-xs text-red-600">{errors.password.message}</p> : null}
            </div>

            {errors.root ? <p className="text-sm text-red-600">{errors.root.message}</p> : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="mr-2 animate-spin" size={16} /> : null}
              Login
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            New here? <Link className="font-medium text-slate-900" to="/register">Create account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
