const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const PREDICTION_TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_PREDICTION_TIMEOUT_MS || 4000
);

export interface PredictionResult {
  label: string;
  confidence: number;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function createRequestSignal(externalSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PREDICTION_TIMEOUT_MS);

  const abort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", abort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abort);
    },
  };
}

async function postPrediction(
  path: string,
  payload: unknown,
  signal?: AbortSignal
): Promise<PredictionResult | null> {
  const request = createRequestSignal(signal);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: request.signal,
    });

    if (!res.ok) {
      return null;
    }

    const result = (await res.json()) as PredictionResult;
    
    // Hard filter on frontend to guarantee no words get through
    if (result && result.label && result.label.length > 1 && result.label !== "Error" && result.label !== "Unknown") {
      return { label: "Unknown", confidence: 0 };
    }
    
    return result;
  } catch (error: unknown) {
    if (isAbortError(error)) return null;
    console.error(`${path} prediction error:`, error);
    return null;
  } finally {
    request.cleanup();
  }
}

export async function predictStatic(
  landmarks: number[],
  signal?: AbortSignal
): Promise<PredictionResult | null> {
  return postPrediction("/predict/static", { landmarks }, signal);
}
