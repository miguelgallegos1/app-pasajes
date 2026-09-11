// components/ModalBiometria.tsx
// Activa y administra el acceso biométrico (Face ID / Touch ID / Windows
// Hello / huella) del dispositivo actual. Es un método ADICIONAL al PIN,
// nunca lo reemplaza. Ni la app ni el servidor ven jamás la huella/rostro:
// el propio dispositivo la valida y solo entrega una firma criptográfica.

"use client";

import { useEffect, useState } from "react";
import { startRegistration, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from "@simplewebauthn/browser";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { useToast } from "./Toast";

type Credencial = { id: string; dispositivo: string | null; creadoEn: string; ultimoUso: string | null };

function nombreDispositivoActual(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Este dispositivo";
}

export default function ModalBiometria({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const toast = useToast();
  const [soportado, setSoportado] = useState<boolean | null>(null);
  const [credenciales, setCredenciales] = useState<Credencial[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [error, setError] = useState("");
  const [idAQuitar, setIdAQuitar] = useState<string | null>(null);
  const [quitando, setQuitando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/auth/webauthn/credenciales");
      if (res.ok) setCredenciales(await res.json());
    } catch {
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!abierto) return;
    setError("");
    cargar();
    (async () => {
      const disponible = browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
      setSoportado(disponible);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const activar = async () => {
    setRegistrando(true);
    setError("");
    try {
      const optsRes = await fetch("/api/auth/webauthn/registro-opciones", { method: "POST" });
      if (!optsRes.ok) {
        throw new Error((await optsRes.json().catch(() => ({}))).error ?? "No se pudo iniciar el registro");
      }
      const opciones = await optsRes.json();

      const respuesta = await startRegistration({ optionsJSON: opciones });

      const verRes = await fetch("/api/auth/webauthn/registro-verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: respuesta, dispositivo: nombreDispositivoActual() }),
      });
      if (!verRes.ok) {
        throw new Error((await verRes.json().catch(() => ({}))).error ?? "No se pudo activar");
      }

      toast.exito("Acceso biométrico activado en este dispositivo");
      await cargar();
    } catch (e: any) {
      const mensaje =
        e?.name === "NotAllowedError" ? "Cancelaste la verificación" : e?.message || "No se pudo activar el acceso biométrico";
      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setRegistrando(false);
    }
  };

  const quitar = async () => {
    if (!idAQuitar) return;
    setQuitando(true);
    try {
      const res = await fetch(`/api/auth/webauthn/credenciales/${idAQuitar}`, { method: "DELETE" });
      setIdAQuitar(null);
      if (res.ok) {
        toast.exito("Dispositivo eliminado");
        cargar();
      } else {
        toast.error("No se pudo quitar el dispositivo");
      }
    } catch {
      setIdAQuitar(null);
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setQuitando(false);
    }
  };

  return (
    <>
      <Modal
        abierto={abierto}
        className="bg-white text-black rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-7 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Acceso biométrico</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Entra con Face ID, huella o Windows Hello en vez de tu PIN. Es adicional: tu PIN siempre sigue funcionando.
          </p>
        </div>

        {soportado === false && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
            Este navegador o dispositivo no tiene un lector biométrico disponible.
          </div>
        )}

        {soportado !== false && (
          <button
            onClick={activar}
            disabled={registrando}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {registrando && <Spinner className="w-4 h-4" />}
            {registrando ? "Verificando..." : "Activar en este dispositivo"}
          </button>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Dispositivos activados</p>
          {cargando && <Spinner className="w-4 h-4 text-neutral-400" />}
          {!cargando && credenciales?.length === 0 && (
            <p className="text-sm text-neutral-400">Todavía no activaste el acceso biométrico en ningún dispositivo.</p>
          )}
          {credenciales?.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{c.dispositivo || "Dispositivo sin nombre"}</p>
                <p className="text-xs text-neutral-400">
                  {c.ultimoUso ? `Último uso: ${new Date(c.ultimoUso).toLocaleDateString()}` : "Nunca usado"}
                </p>
              </div>
              <button onClick={() => setIdAQuitar(c.id)} className="text-xs font-medium text-red-600 hover:text-red-700 shrink-0">
                Quitar
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onCerrar}
          className="w-full text-center text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl py-2.5 transition"
        >
          Cerrar
        </button>
      </Modal>

      <Modal
        abierto={!!idAQuitar}
        variante="centro"
        className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl"
      >
        <p className="font-semibold text-neutral-900">¿Quitar este dispositivo?</p>
        <p className="text-sm text-neutral-500">Ya no vas a poder entrar con biometría desde ahí.</p>
        <div className="flex gap-2 justify-center pt-1">
          <button
            onClick={() => setIdAQuitar(null)}
            disabled={quitando}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={quitar}
            disabled={quitando}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 transition"
          >
            {quitando ? "Quitando..." : "Quitar"}
          </button>
        </div>
      </Modal>
    </>
  );
}
