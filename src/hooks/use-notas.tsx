import { createContext, useContext, useEffect, useState } from "react";
import { ArquivoUpload } from "@/data/types";
import {
  buildNotasFromCsv,
  buildNotasCsv,
  createPendingNota,
  createUploadRecord,
  downloadCsv,
  loadNotasState,
  NOTAS_STORAGE_KEY,
  nowIso,
  removeNotaAndUploads,
  removeAllUploads,
  removeUpload,
  replaceNota,
  resolveNotaAlertas,
  resolveTipoArquivo,
  saveNotasState,
  upsertUpload,
  type NotasState,
} from "@/lib/notas";
import { readCsvFile } from "@/lib/csv-parser";

interface NotasContextValue extends NotasState {
  hydrated: boolean;
  addFiles: (files: File[]) => Promise<void>;
  deleteNota: (notaId: string) => void;
  deleteUpload: (uploadId: string) => void;
  clearUploads: () => void;
  reprocessNota: (notaId: string) => Promise<boolean>;
  resolveAlertas: (notaId: string) => void;
  exportCsv: (notaIds?: string[], fileName?: string) => string;
}

const NotasContext = createContext<NotasContextValue | undefined>(undefined);

export function NotasProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NotasState>(() => loadNotasState());

  useEffect(() => {
    saveNotasState(state);
  }, [state]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== NOTAS_STORAGE_KEY) {
        return;
      }

      setState(loadNotasState());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  async function addFiles(files: File[]) {
    for (const file of files) {
      await processFile(file);
    }
  }

  function deleteNota(notaId: string) {
    setState((currentState) => removeNotaAndUploads(currentState, notaId));
  }

  function deleteUpload(uploadId: string) {
    setState((currentState) => removeUpload(currentState, uploadId));
  }

  function clearUploads() {
    setState((currentState) => removeAllUploads(currentState));
  }

  async function reprocessNota(notaId: string) {
    const upload = state.uploads.find(
      (currentUpload) =>
        currentUpload.tipo_arquivo === "csv" &&
        (currentUpload.nota_id === notaId || currentUpload.nota_ids?.includes(notaId)) &&
        Boolean(currentUpload.conteudo_original),
    );

    if (!upload?.conteudo_original) {
      return false;
    }

    const noteIds = upload.nota_ids?.length ? upload.nota_ids : upload.nota_id ? [upload.nota_id] : [];
    const notasExistentes = state.notas.filter((nota) => noteIds.includes(nota.id));
    if (notasExistentes.length === 0) {
      return false;
    }

    const uploadProcessando: ArquivoUpload = {
      ...upload,
      status_processamento: "processando",
      mensagem_erro: undefined,
    };

    setState((currentState) => ({
      ...currentState,
      uploads: upsertUpload(currentState.uploads, uploadProcessando),
    }));

    try {
      const notasReprocessadas = buildNotasFromCsv({
        fileName: upload.nome_arquivo,
        csvContent: upload.conteudo_original,
        existingNotas: state.notas.filter((nota) => !noteIds.includes(nota.id)),
        createdAt: notasExistentes[0]?.created_at ?? upload.created_at,
        updatedAt: nowIso(),
      });

      const uploadAtualizado: ArquivoUpload = {
        ...upload,
        nota_id: notasReprocessadas[0]?.id,
        nota_ids: notasReprocessadas.map((nota) => nota.id),
        status_processamento: "concluido",
        registros_processados: notasReprocessadas.length,
        mensagem_erro: undefined,
      };

      setState((currentState) => {
        const notasRestantes = currentState.notas.filter((nota) => !noteIds.includes(nota.id));
        const notasAtualizadas = notasReprocessadas.reduce((acc, nota) => replaceNota(acc, nota), notasRestantes);

        return {
          notas: notasAtualizadas,
          uploads: upsertUpload(currentState.uploads, uploadAtualizado),
        };
      });

      return true;
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      setState((currentState) => {
        const uploadAtualizado: ArquivoUpload = {
          ...upload,
          status_processamento: "erro",
          mensagem_erro: errorMessage,
        };

        return {
          notas: currentState.notas.map((nota) =>
            noteIds.includes(nota.id)
              ? {
                  ...nota,
                  status_analise: "erro",
                  updated_at: nowIso(),
                }
              : nota
          ),
          uploads: upsertUpload(currentState.uploads, uploadAtualizado),
        };
      });

      return false;
    }
  }

  function resolveAlertas(notaId: string) {
    setState((currentState) => {
      const nota = currentState.notas.find((currentNota) => currentNota.id === notaId);
      if (!nota) {
        return currentState;
      }

      return {
        ...currentState,
        notas: replaceNota(currentState.notas, resolveNotaAlertas(nota)),
      };
    });
  }

  function exportCsv(notaIds?: string[], fileName = "resumo-iob.csv") {
    const notas = notaIds
      ? state.notas.filter((nota) => notaIds.includes(nota.id))
      : state.notas;

    const csv = buildNotasCsv(notas);
    downloadCsv(csv, fileName);
    return csv;
  }

  async function processFile(file: File) {
    const createdAt = nowIso();
    const tipoArquivo = resolveTipoArquivo(file);

    if (!tipoArquivo) {
      return;
    }

    const uploadBase = createUploadRecord({
      fileName: file.name,
      tipoArquivo,
      status: tipoArquivo === "csv" ? "processando" : "aguardando",
      createdAt,
      size: file.size,
    });

    setState((currentState) => ({
      ...currentState,
      uploads: upsertUpload(currentState.uploads, uploadBase),
    }));

    if (tipoArquivo === "csv") {
      let csvContent: string;

      try {
        csvContent = await readCsvFile(file);
      } catch (error) {
        const uploadErro = createUploadRecord({
          id: uploadBase.id,
          fileName: file.name,
          tipoArquivo,
          status: "erro",
          createdAt,
          size: file.size,
          errorMessage: getErrorMessage(error),
        });

        setState((currentState) => ({
          ...currentState,
          uploads: upsertUpload(currentState.uploads, uploadErro),
        }));

        return;
      }

      setState((currentState) => {
        try {
          const notas = buildNotasFromCsv({
            fileName: file.name,
            csvContent,
            existingNotas: currentState.notas,
            createdAt,
            updatedAt: nowIso(),
          });

          const uploadConcluido = createUploadRecord({
            id: uploadBase.id,
            notaId: notas[0]?.id,
            noteIds: notas.map((nota) => nota.id),
            fileName: file.name,
            tipoArquivo,
            status: "concluido",
            createdAt,
            size: file.size,
            originalContent: csvContent,
            processedCount: notas.length,
          });

          const notasAtualizadas = notas.reduce((acc, nota) => replaceNota(acc, nota), currentState.notas);

          return {
            notas: notasAtualizadas,
            uploads: upsertUpload(currentState.uploads, uploadConcluido),
          };
        } catch (error) {
          const uploadErro = createUploadRecord({
            id: uploadBase.id,
            fileName: file.name,
            tipoArquivo,
            status: "erro",
            createdAt,
            size: file.size,
            originalContent: csvContent,
            errorMessage: getErrorMessage(error),
          });

          return {
            ...currentState,
            uploads: upsertUpload(currentState.uploads, uploadErro),
          };
        }
      });

      return;
    }

    setState((currentState) => {
      const nota = createPendingNota(file.name, tipoArquivo, createdAt);
      const uploadConcluido = createUploadRecord({
        id: uploadBase.id,
        notaId: nota.id,
        fileName: file.name,
        tipoArquivo,
        status: "concluido",
        createdAt,
        size: file.size,
      });

      return {
        notas: replaceNota(currentState.notas, nota),
        uploads: upsertUpload(currentState.uploads, uploadConcluido),
      };
    });
  }

  return (
    <NotasContext.Provider
      value={{
        ...state,
        hydrated: true,
        addFiles,
        deleteNota,
        deleteUpload,
        clearUploads,
        reprocessNota,
        resolveAlertas,
        exportCsv,
      }}
    >
      {children}
    </NotasContext.Provider>
  );
}

export function useNotas() {
  const context = useContext(NotasContext);

  if (!context) {
    throw new Error("useNotas must be used within NotasProvider.");
  }

  return context;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível processar o arquivo.";
}
