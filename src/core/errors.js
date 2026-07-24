/**
 * Algemene foutafhandeling (core, briefing 4.1 / 17).
 *
 * AppError draagt een boodschap die rechtstreeks aan de gebruiker getoond
 * mag worden. Onverwachte fouten worden lokaal gelogd en krijgen een korte,
 * bruikbare generieke boodschap in plaats van een technische foutmelding.
 */

export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AppError";
    if (options.cause) this.cause = options.cause;
  }
}

export function logError(context, error) {
  console.error(`[Ketting] ${context}:`, error);
}

export function userMessage(error, fallback = "Er ging iets mis bij het opslaan. Probeer het opnieuw.") {
  if (error instanceof AppError) return error.message;
  return fallback;
}
