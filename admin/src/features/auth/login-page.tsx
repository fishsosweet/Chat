import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { authStore } from "../../store/auth-store";

export function LoginPage() {
  const navigate = useNavigate();
  const login = authStore((state) => state.login);
  const [email, setEmail] = useState("step4ok_1785999282@example.com");
  const [password, setPassword] = useState("Aa!12345");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({
        email,
        password,
        platform: "WEB",
        deviceName: "Admin Dashboard"
      });
      navigate("/", { replace: true });
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Dang nhap that bai");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <form className="login-card" onSubmit={onSubmit}>
        <p className="eyebrow">ChatRealtime Control Tower</p>
        <h1>Admin Access</h1>
        <p className="sub">Quan ly nguoi dung, bao cao, tep tin va he thong realtime.</p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Dang dang nhap..." : "Dang nhap Admin"}
        </button>
      </form>
    </div>
  );
}
