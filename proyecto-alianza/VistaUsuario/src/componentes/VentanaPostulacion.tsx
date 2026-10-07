import { useEffect, useRef, useState } from "react";
import { ErrorApi, enviarPostulacion, pedirFormulario, type Pregunta } from "../api";
import { useIdioma, useTextos } from "../textos";
import { useVentanaAbierta } from "../ventana";

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Revisa la respuesta de un paso; devuelve el mensaje de error o "" si está bien. */
function revisar(pregunta: Pregunta, valores: string[]): string {
  const llenos = valores.map((v) => v.trim()).filter(Boolean);
  const esDeOpciones = pregunta.tipo === "Opcion" || pregunta.tipo === "VariasOpciones";

  if (pregunta.obligatoria && llenos.length === 0) return esDeOpciones ? "Elige una opción para continuar." : "Completa este paso para continuar.";
  if (pregunta.tipo === "Correo" && llenos[0] && !PATRON_CORREO.test(llenos[0])) return "Escribe un correo válido.";
  return "";
}

/**
 * Formulario «Postula tu proyecto»: un paso por pregunta (entre 3 y 5, se configuran en el panel).
 * Lo enviado se guarda en la base de datos y le llega como aviso a YishAdmin en el panel.
 */
export default function VentanaPostulacion({ alCerrar }: { alCerrar: () => void }) {
  const t = useTextos();
  const { idioma } = useIdioma();
  const [preguntas, setPreguntas] = useState<Pregunta[] | null>(null);
  const [falloLaCarga, setFalloLaCarga] = useState(false);
  const [paso, setPaso] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<number, string[]>>({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const trampa = useRef<HTMLInputElement>(null);
  const zonaDelPaso = useRef<HTMLDivElement>(null);
  const total = preguntas?.length ?? 0;
  const actual = preguntas?.[paso];
  const valores = actual ? respuestas[actual.id] ?? [] : [];
  const esUltimoPaso = paso === total - 1;
  useVentanaAbierta(alCerrar);

  // 1. Pedir las preguntas al abrir.
  useEffect(() => {
    pedirFormulario(idioma).then(setPreguntas).catch(() => setFalloLaCarga(true));
  }, [idioma]);

  // 2. En cada paso, llevar el foco al campo (teclado y lectores de pantalla).
  useEffect(() => {
    zonaDelPaso.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
  }, [paso, preguntas]);

  function responder(nuevosValores: string[]) {
    if (!actual) return;
    setRespuestas((anteriores) => ({ ...anteriores, [actual.id]: nuevosValores }));
    setError("");
  }

  // 3. Avanzar: revisar el paso; si es el último, enviar todo.
  async function avanzar() {
    if (!actual || !preguntas) return;
    const problema = revisar(actual, valores);
    if (problema) { setError(problema); return; }
    if (!esUltimoPaso) { setPaso(paso + 1); return; }

    setEnviando(true);
    try {
      await enviarPostulacion(
        preguntas.map((p) => ({ preguntaId: p.id, valores: (respuestas[p.id] ?? []).map((v) => v.trim()).filter(Boolean) })),
        trampa.current?.value ?? "");
      setEnviada(true);
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 429) setError("Recibimos varias postulaciones desde tu conexión. Intenta de nuevo en unos minutos.");
      else setError(e instanceof Error ? e.message : "No pudimos enviar tu postulación. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function campo(pregunta: Pregunta) {
    const varias = pregunta.tipo === "VariasOpciones";

    if (pregunta.tipo === "Opcion" || varias) {
      return (
        <div className="quiz-opciones" role={varias ? "group" : "radiogroup"} aria-label={pregunta.texto}>
          {pregunta.opciones.map((opcion, i) => {
            const marcada = valores.includes(opcion);
            const alElegir = () => responder(varias ? (marcada ? valores.filter((v) => v !== opcion) : [...valores, opcion]) : [opcion]);
            return (
              <button key={opcion} type="button" role={varias ? "checkbox" : "radio"} aria-checked={marcada}
                className={`quiz-opcion ${marcada ? "activa" : ""}`} onClick={alElegir}>
                {pregunta.etiquetas[i] ?? opcion}
              </button>
            );
          })}
        </div>
      );
    }
    if (pregunta.tipo === "TextoLargo") {
      return <textarea className="quiz-input" rows={6} maxLength={4000} value={valores[0] ?? ""}
        onChange={(e) => responder([e.target.value])} aria-label={pregunta.texto} />;
    }
    return (
      <input
        className="quiz-input"
        type={pregunta.tipo === "Correo" ? "email" : "text"}
        autoComplete={pregunta.tipo === "Correo" ? "email" : pregunta.tipo === "Nombre" ? "name" : "off"}
        maxLength={pregunta.tipo === "Correo" ? 255 : 300}
        value={valores[0] ?? ""}
        onChange={(e) => responder([e.target.value])}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void avanzar(); } }}
        aria-label={pregunta.texto}
      />
    );
  }

  return (
    <div className="quiz-overlay" onClick={alCerrar}>
      <div className="quiz-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-titulo" onClick={(e) => e.stopPropagation()}>
        <button className="socio-modal-close" onClick={alCerrar} aria-label="Cerrar">✕</button>

        {enviada ? (
          <div className="quiz-exito">
            <div className="quiz-exito-icono" aria-hidden="true">✓</div>
            <h2 id="quiz-titulo" className="quiz-titulo">{t("formulario.exito.titulo")}</h2>
            <p className="quiz-intro">{t("formulario.exito.texto")}</p>
            <button className="btn-primary" onClick={alCerrar}>Cerrar</button>
          </div>
        ) : (
          <>
            <h2 id="quiz-titulo" className="quiz-titulo">{t("formulario.titulo")}</h2>
            {paso === 0 && t("formulario.intro") && <p className="quiz-intro">{t("formulario.intro")}</p>}
            {falloLaCarga && <p className="quiz-error">No pudimos cargar el formulario. Intenta de nuevo más tarde.</p>}
            {!preguntas && !falloLaCarga && <p className="quiz-intro">Cargando…</p>}

            {actual && (
              <>
                <div className="quiz-progreso" aria-hidden="true">
                  {preguntas!.map((p, i) => <span key={p.id} className={i <= paso ? "hecho" : ""} />)}
                </div>
                <p className="quiz-paso-num">Paso {paso + 1} de {total}</p>

                <div className="quiz-pregunta" ref={zonaDelPaso} key={actual.id}>
                  <label className="quiz-pregunta-texto">
                    {actual.texto}{!actual.obligatoria && <span className="quiz-opcional"> (opcional)</span>}
                  </label>
                  {actual.ayuda && <p className="quiz-ayuda">{actual.ayuda}</p>}
                  {campo(actual)}
                </div>

                {/* Campo trampa: invisible para personas; si un bot lo rellena, el envío se descarta. */}
                <input ref={trampa} className="quiz-trampa" type="text" name="sitio" tabIndex={-1} autoComplete="off" aria-hidden="true" />

                {error && <p className="quiz-error" role="alert">{error}</p>}

                <div className="quiz-acciones">
                  <button className="btn-secondary" disabled={paso === 0 || enviando} onClick={() => { setError(""); setPaso(paso - 1); }}>
                    Atrás
                  </button>
                  <button className="btn-primary" disabled={enviando} onClick={() => void avanzar()}>
                    {!esUltimoPaso ? "Siguiente" : enviando ? "Enviando…" : "Enviar postulación"}
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
