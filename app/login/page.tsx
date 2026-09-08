// app/login/page.tsx
// Pantalla de login: 6 cajitas de PIN, tema negro y naranja, logo de buseta.
// También ofrece entrar con biometría (Face ID/Touch ID/Windows Hello/huella)
// si el dispositivo la soporta y el usuario ya la activó antes.

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { APP_NOMBRE } from "../../lib/config";
import Spinner from "../../components/Spinner";
import { IconoHuella } from "../../components/Icons";

const DESTINO_POR_ROL: Record<string, string> = {
  SUPER_ADMIN: "/dashboard",
  ADMIN_TH: "/dashboard",
  COLABORADOR: "/mis-pasajes",
  FINANZAS: "/dashboard",
};

export default function LoginPage() {
  const [digitos, setDigitos] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState("Verificando tu PIN...");
  const [biometriaDisponible, setBiometriaDisponible] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (error && !loading) {
      inputsRef.current[0]?.focus();
    }
  }, [error, loading]);

  useEffect(() => {
    // Import diferido: el código de WebAuthn (~16KB) no viaja con el
    // bundle inicial del login, se pide en paralelo sin bloquear las
    // cajitas del PIN, que deben quedar usables de inmediato.
    (async () => {
      try {
        const { browserSupportsWebAuthn, platformAuthenticatorIsAvailable } = await import("@simplewebauthn/browser");
        const disponible = browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
        setBiometriaDisponible(disponible);
      } catch {
        setBiometriaDisponible(false);
      }
    })();
  }, []);

  const irADestino = (rol: string) => {
    // Dejamos "loading" en true a propósito — la pantalla se queda mostrando
    // el overlay de carga hasta que router.push() navegue de verdad,
    // evitando el "parpadeo" de volver al formulario justo antes de cambiar.
    router.push(DESTINO_POR_ROL[rol] ?? "/");
  };

  const enviarPin = async (pinCompleto: string) => {
    setMensajeCarga("Verificando tu PIN...");
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pinCompleto }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "PIN incorrecto");
      setDigitos(["", "", "", "", "", ""]);
      setLoading(false);
      return;
    }

    const { rol } = await res.json();
    irADestino(rol);
  };

  const entrarConBiometria = async () => {
    setMensajeCarga("Verificando tu identidad...");
    setLoading(true);
    setError("");
    try {
      const [{ startAuthentication }, optsRes] = await Promise.all([
        import("@simplewebauthn/browser"),
        fetch("/api/auth/webauthn/login-opciones", { method: "POST" }),
      ]);
      if (!optsRes.ok) throw new Error("No se pudo iniciar la verificación");
      const opciones = await optsRes.json();

      const respuesta = await startAuthentication({ optionsJSON: opciones });

      const verRes = await fetch("/api/auth/webauthn/login-verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(respuesta),
      });

      if (!verRes.ok) {
        const data = await verRes.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo verificar tu identidad");
      }

      const { rol } = await verRes.json();
      irADestino(rol);
    } catch (e: any) {
      if (e?.name !== "NotAllowedError") {
        setError(e?.message || "No se pudo verificar tu identidad");
      }
      setLoading(false);
    }
  };

  const handleChange = (index: number, valor: string) => {
    const soloNumero = valor.replace(/[^0-9]/g, "").slice(-1);
    const nuevosDigitos = [...digitos];
    nuevosDigitos[index] = soloNumero;
    setDigitos(nuevosDigitos);

    if (soloNumero && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (nuevosDigitos.every((d) => d !== "") && index === 5) {
      enviarPin(nuevosDigitos.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digitos[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 relative">
      <div className={`w-full max-w-sm transition-opacity ${loading ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl border-2 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.5)] bg-neutral-900 mb-4 p-4">
          <img src="/logo.png" alt={APP_NOMBRE} className="w-full h-full object-contain" />
        </div>
          <h1 className="text-2xl font-bold text-white">{APP_NOMBRE}</h1>
          <p className="text-sm text-neutral-400 mt-1">Ingresa tu PIN de 6 dígitos</p>
        </div>

        <div className="flex justify-center gap-2 sm:gap-3">
          {digitos.map((digito, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digito}
              disabled={loading}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl
                        bg-neutral-900 border-2 border-neutral-700 text-white
                        focus:border-orange-500 focus:shadow-[0_0_20px_rgba(249,115,22,0.5)]
                        outline-none transition disabled:opacity-40"
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}

        {biometriaDisponible && (
          <button
            type="button"
            onClick={entrarConBiometria}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-2 text-sm font-medium text-neutral-300 border border-neutral-700 rounded-xl py-3 hover:bg-neutral-900 hover:border-neutral-600 transition disabled:opacity-40"
          >
            <IconoHuella className="w-4 h-4" />
            Usar acceso biométrico
          </button>
        )}
      </div>

      {/* Overlay de carga: cubre toda la pantalla mientras se verifica,
          para que sea imposible confundirlo con que "no está pasando nada". */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
          <Spinner className="w-10 h-10 text-orange-500" />
          <p className="text-sm text-orange-400 font-medium">{mensajeCarga}</p>
        </div>
      )}
    </div>
  );
}
