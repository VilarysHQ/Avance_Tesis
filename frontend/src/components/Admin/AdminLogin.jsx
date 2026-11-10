import { useState } from "react";
import { AlertCircle, Loader2, LockKeyhole } from "lucide-react";

export default function AdminLogin({ onLogin, initialError = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await onLogin(email, password);
    } catch (requestError) {
      if (requestError?.status === 429) {
        setError("Demasiados intentos. Espera unos minutos antes de volver a intentar.");
      } else if (requestError?.status === 503) {
        setError("El acceso administrativo no está disponible temporalmente.");
      } else if (requestError?.isNetworkError) {
        setError("No pudimos conectar con el servidor.");
      } else {
        setError("Correo o contraseña incorrectos.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8ff] px-5 py-10">
      <section className="w-full max-w-[430px] rounded-[24px] border border-slate-100 bg-white p-7 shadow-[0_25px_80px_rgba(30,64,175,0.10)] sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#173cff] text-white shadow-[0_12px_30px_rgba(23,60,255,0.25)]">
          <LockKeyhole size={24} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-extrabold text-[#07112d]">
          Acceso administrativo
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Ingresa tus credenciales para revisar las solicitudes.
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700">
            Correo
            <input
              type="email"
              autoComplete="username"
              required
              maxLength={190}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </label>

          {error && (
            <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 shrink-0" size={17} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173cff] font-semibold text-white transition hover:bg-[#0f31e6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}
