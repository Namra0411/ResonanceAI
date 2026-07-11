/**
 * Prompt-injection defenses for retrieved document content.
 *
 * Retrieved chunks come from arbitrary user-uploaded documents — untrusted
 * content that gets placed directly into the LLM prompt. This module is
 * defense in depth, NOT the primary defense on its own:
 *
 *   1. neutralizeRoleMarkers() — strips/escapes fake role or delimiter
 *      tokens a malicious document could use to impersonate a system or
 *      assistant turn (e.g. fake "System:" lines, chat-template tokens).
 *   2. detectInjectionAttempt() — heuristic scan for common injection
 *      phrasing. Used to FLAG suspicious chunks for logging/telemetry,
 *      not to silently block them — heuristics are trivially bypassable
 *      by a determined attacker, so they're signal, not a gate.
 *
 * The actual primary defense is structural: retrieved content is wrapped
 * in explicit <document_context> tags in chat.service.js, and the system
 * prompt instructs the model to treat that block as inert data to read,
 * never as instructions to follow. This module narrows the attack surface
 * further and gives visibility into attempts, it doesn't replace that.
 */

const ROLE_MARKER_PATTERNS = [
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /\[\/?INST\]/gi,
  /<<\s*SYS\s*>>/gi,
  /<<\/\s*SYS\s*>>/gi,
  /^\s*(system|assistant|user)\s*:/gim,
  /###\s*(system|instruction)/gi,
  /<\/?document_context>/gi,
  /<\/?user_question>/gi,
  /<\/?conversation_history>/gi,
];

const INJECTION_PHRASE_PATTERNS = [
  /ignore (all|any|the)? ?(previous|above|prior) instructions/i,
  /disregard (all|any|the)? ?(previous|above|prior) instructions/i,
  /you are now/i,
  /new instructions\s*:/i,
  /reveal (your|the) (system prompt|instructions)/i,
  /act as (if )?you (are|were)/i,
  /pretend (you are|to be)/i,
  /forget (everything|all) (you|above)/i,
  /override (your|the) (rules|instructions)/i,
  /respond only with/i,
  /do not (follow|obey) (your|the) (previous|original) (rules|instructions)/i,
];

/**
 * Escapes fake role markers and fake XML-style delimiter tags so a document
 * can't spoof the structural boundaries the prompt relies on, or pretend to
 * be a system/assistant turn.
 */
export function neutralizeRoleMarkers(text) {
  let cleaned = text;
  for (const pattern of ROLE_MARKER_PATTERNS) {
    cleaned = cleaned.replace(pattern, (match) => `[filtered: ${match.trim()}]`);
  }
  return cleaned;
}

/** Heuristic only — used for flagging/telemetry, never as a hard block. */
export function detectInjectionAttempt(text) {
  return INJECTION_PHRASE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Runs both defenses on a single chunk of retrieved text.
 * Returns the neutralized text plus whether it was flagged as suspicious.
 */
export function sanitizeChunkText(text) {
  const flagged = detectInjectionAttempt(text);
  const cleaned = neutralizeRoleMarkers(text);
  return { text: cleaned, flagged };
}