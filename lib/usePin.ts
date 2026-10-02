// lib/usePin.ts
// PIN de acceso generado por el servidor (/api/auth/generar-pin) para un
// usuario o colaborador nuevo, o al resetearlo: el PIN, su firma (TH solo
// puede guardar PINs firmados, ver lib/pinFirmado.ts) y el estado de
// "generando" / "copiado". Lo usan PanelColaboradoresTH y PanelUsuariosAdmin.
// Con el código de nómina (nuevo colaborador), si ese código es el de un
// usuario de la app no se genera PIN: esUsuario queda en true (su ficha se
// crea sin acceso).

"use client";

import { useRef, useState } from "react";
import { useToast } from "../components/Toast";

export function usePin() {
  const toast = useToast();
  const [pin, setPin] = useState("");
  const [firma, setFirma] = useState("");
  const [generando, setGenerando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [esUsuario, setEsUsuario] = useState(false);
  // Evita que una respuesta fuera de orden (Resetear -> Cancelar ->
  // Resetear de nuevo, muy seguido) termine mostrando un PIN de una
  // petición vieja como si fuera el actual.
  const peticionRef = useRef(0);

  // Se usa también como onClick directo (recibe el evento): solo un texto
  // cuenta como código de nómina.
  const generar = async (codigoNomina?: unknown) => {
    const idPeticion = ++peticionRef.current;
    setGenerando(true);
    setCopiado(false);
    try {
      const res = await fetch("/api/auth/generar-pin", {
        method: "POST",
        ...(typeof codigoNomina === "string"
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigoNomina }) }
          : {}),
      });
      if (idPeticion !== peticionRef.current) return;
      if (res.ok) {
        const data = await res.json();
        setEsUsuario(!!data.esUsuario);
        setPin(data.pin ?? "");
        setFirma(data.firma ?? "");
      } else {
        toast.error("No se pudo generar un PIN, intenta de nuevo");
      }
    } catch {
      if (idPeticion === peticionRef.current) {
        toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      }
    } finally {
      if (idPeticion === peticionRef.current) setGenerando(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar, cópialo manualmente");
    }
  };

  // Descarta el PIN mostrado (y cualquier respuesta aún en camino).
  const limpiar = () => {
    peticionRef.current++;
    setPin("");
    setFirma("");
    setGenerando(false);
    setEsUsuario(false);
  };

  return { pin, firma, generando, copiado, esUsuario, generar, copiar, limpiar };
}
