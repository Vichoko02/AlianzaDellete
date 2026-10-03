import { useEffect, useRef, useState } from "react";
import { apiEnviarSolicitud, apiQuiz, type PreguntaQuiz } from "../api";
import { useTextos } from "../textos";

/**
 * Formulario «Postula tu proyecto»: un paso por pregunta (entre 3 y 5, configurables en el panel).
 * Lo enviado llega a la base de datos y aparece como notificación en el panel de YishAdmin.
 */
export default function QuizModal({ onClose }: { onClose: () => void }) {
  const t = useTextos();
  const [preguntas, setPreguntas] = useState<PreguntaQuiz[] | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [paso, setPaso] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<number, string[]>>({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const trampa = useRef<HTMLInputElement>(null);
  const campo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiQuiz().then(setPreguntas).catch(() => setErrorCarga(true));
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  // Lleva el foco al campo de cada paso (teclado y lectores de pantalla).
  useEffect(() => {
    campo.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
  }, [paso, preguntas]);

  const total = preguntas?.length ?? 0;
  const actual = preguntas?.[paso];
  const valores = actual ? respuestas[actual.id] ?? [] : [];

  const poner = (vals: string[]) => {
    if (!actual) return;
    setRespuestas((r) => ({ ...r, [actual.id]: vals }));
    setError("");
  };

  function validar(p: PreguntaQuiz, vals: string[]): string {
    const llenos = vals.map((v) => v.trim()).filter(Boolean);
    if (p.requerida && llenos.length === 0) return p.tipo === "Opcion" || p.tipo === "VariasOpciones" ? "Elige una opción para continuar." : "Completa este paso para continuar.";
    if (p.tipo === "Email" && llenos[0] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(llenos[0])) return "Escribe un correo válido.";
    return "";
  }

  async function siguiente() {
    if (!actual || !preguntas) return;
    const e = validar(actual, valores);
    if (e) { setError(e); return; }
    if (paso < total - 1) { setPaso(paso + 1); return; }

    setEnviando(true);
    try {
      await apiEnviarSolicitud(
        preguntas.map((p) => ({ preguntaId: p.id, valores: (respuestas[p.id] ?? []).map((v) => v.trim()).filter(Boolean) })),
        trampa.current?.value ?? "");
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error && err.message.startsWith("Error 429")
        ? "Recibimos varias postulaciones desde tu conexión. Intenta de nuevo en unos minutos."
        : err instanceof Error ? err.message : "No pudimos enviar tu postulación. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function control(p: PreguntaQuiz) {
    switch (p.tipo) {
      case "Opcion":
      case "VariasOpciones": {
        const varias = p.tipo === "VariasOpciones";
        return (
          <div className="quiz-opciones" role={varias ? "group" : "radiogroup"} aria-label={p.texto}>
            {p.opciones.map((o) => {
              const marcada = valores.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  role={varias ? "checkbox" : "radio"}
                  aria-checked={marcada}
                  className={`quiz-opcion ${marcada ? "activa" : ""}`}
                  onClick={() => poner(varias ? (marcada ? valores.filter((v) => v !== o) : [...valores, o]) : [o])}
                >
                  {o}
                </button>
              );
            })}
          </div>
        );
      }
      case "TextoLargo":
        return <textarea className="quiz-input" rows={6} maxLength={4000} value={valores[0] ?? ""} onChange={(e) => poner([e.target.value])} aria-label={p.texto} />;
      default:
        return (
          <input
            className="quiz-input"
            type={p.tipo === "Email" ? "email" : "text"}
            autoComplete={p.tipo === "Email" ? "email" : p.tipo === "Nombre" ? "name" : "off"}
            maxLength={p.tipo === "Email" ? 255 : 300}
            value={valores[0] ?? ""}
            onChange={(e) => poner([e.target.value])}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void siguiente(); } }}
            aria-label={p.texto}
          />
        );
    }
  }

  return (
    <div className="quiz-overlay" onClick={onClose}>
      <div className="quiz-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-titulo" onClick={(e) => e.stopPropagation()}>
        <button className="socio-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>

        {enviado ? (
          <div className="quiz-exito">
            <div className="quiz-exito-icono" aria-hidden="true">✓</div>
            <h2 id="quiz-titulo" className="quiz-titulo">{t("quiz.exito.titulo")}</h2>
            <p className="quiz-intro">{t("quiz.exito.texto")}</p>
            <button className="btn-primary" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <>
            <h2 id="quiz-titulo" className="quiz-titulo">{t("quiz.titulo")}</h2>
            {paso === 0 && t("quiz.intro") && <p className="quiz-intro">{t("quiz.intro")}</p>}

            {errorCarga && <p className="quiz-error">No pudimos cargar el formulario. Intenta de nuevo más tarde.</p>}
            {!preguntas && !errorCarga && <p className="quiz-intro">Cargando…</p>}

            {actual && (
              <>
                <div className="quiz-progreso" aria-hidden="true">
                  {preguntas!.map((p, i) => <span key={p.id} className={i <= paso ? "hecho" : ""} />)}
                </div>
                <p className="quiz-paso-num">Paso {paso + 1} de {total}</p>

                <div className="quiz-pregunta" ref={campo} key={actual.id}>
                  <label className="quiz-pregunta-texto">
                    {actual.texto}{!actual.requerida && <span className="quiz-opcional"> (opcional)</span>}
                  </label>
                  {actual.ayuda && <p className="quiz-ayuda">{actual.ayuda}</p>}
                  {control(actual)}
                </div>

                {/* Campo trampa: invisible para personas; si un bot lo rellena, el envío se descarta. */}
                <input ref={trampa} className="quiz-trampa" type="text" name="sitio" tabIndex={-1} autoComplete="off" aria-hidden="true" />

                {error && <p className="quiz-error" role="alert">{error}</p>}

                <div className="quiz-acciones">
                  <button className="btn-secondary" disabled={paso === 0 || enviando} onClick={() => { setError(""); setPaso(paso - 1); }}>
                    Atrás
                  </button>
                  <button className="btn-primary" disabled={enviando} onClick={() => void siguiente()}>
                    {paso < total - 1 ? "Siguiente" : enviando ? "Enviando…" : "Enviar postulación"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
