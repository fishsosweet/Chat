import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authStore } from "@/features/auth/store/auth.store";

const registerSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    email: z.email(),
    password: z
      .string()
      .min(8)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/),
    confirmPassword: z.string().min(8)
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match"
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const registerAction = authStore((state) => state.register);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (values: RegisterForm) => {
    try {
      await registerAction({
        fullName: values.fullName,
        email: values.email,
        password: values.password
      });
      navigate("/");
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Could not register"
      });
    }
  };

  return (
    <div className="auth-background grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Set up your profile to start chatting in realtime.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input placeholder="Full name" {...register("fullName")} />
            {errors.fullName ? <p className="text-xs text-red-600">{errors.fullName.message}</p> : null}

            <Input placeholder="Email" type="email" {...register("email")} />
            {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}

            <Input placeholder="Password" type="password" {...register("password")} />
            {errors.password ? (
              <p className="text-xs text-red-600">Password must include upper/lowercase, number and symbol.</p>
            ) : null}

            <Input placeholder="Confirm password" type="password" {...register("confirmPassword")} />
            {errors.confirmPassword ? <p className="text-xs text-red-600">{errors.confirmPassword.message}</p> : null}

            {errors.root ? <p className="text-sm text-red-600">{errors.root.message}</p> : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="mr-2 animate-spin" size={16} /> : null}
              Create account
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            Already have an account? <Link className="font-medium text-slate-900" to="/">Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
