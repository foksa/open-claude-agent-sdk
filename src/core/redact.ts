/**
 * Credential redaction for text the SDK surfaces from the CLI (the stderr
 * tail in exit errors).
 *
 * Patterns are ported from the official SDK's redactor (v0.3.276) so the same
 * token shapes are masked, plus URL userinfo and secret-bearing query
 * parameters, which the official SDK leaves alone.
 *
 * @internal
 */

type Rule = [RegExp, string];

/** `prefix` + at least `min` chars of `chars`, anchored at a word boundary or behind `guard` lookaheads. */
function token(
  prefix: string,
  chars: string,
  min: number,
  guard: string,
  suffix = '',
  boundaryGuard = '',
  flags = 'g'
): RegExp {
  const body = `${chars}{${min},}${suffix}`;
  return new RegExp(`(?:\\b${prefix}${boundaryGuard}${body}|${prefix}${guard}${body})`, flags);
}

/** Lookahead: a digit within the next 64 chars of `chars`. */
const hasDigit = (chars: string): string => `(?=${chars}{0,64}[0-9])`;

/** Lookahead: `min` alphanumerics that include both a digit and a letter. */
const mixedAlnum = (min: number): string =>
  `(?=[A-Za-z0-9_-]{0,64}?(?=[A-Za-z0-9]{${min}})(?=[A-Za-z0-9]{0,64}[0-9])(?=[A-Za-z0-9]{0,64}[A-Za-z]))`;

const SLACK_CHARS = '[A-Za-z0-9+/=%_-]';

const RULES: Rule[] = [
  // HTTP auth headers
  // Percent-encoded characters count toward the token (v0.3.287)
  [
    /\bBearer\s+(?=[A-Za-z0-9._~+/=-](?:[A-Za-z0-9._~+/=-]|%[0-9A-Fa-f]{2}){7})[A-Za-z0-9._~+/=-](?:[A-Za-z0-9._~+/=-]+|%[0-9A-Fa-f]{2})*/gi,
    'Bearer <token>',
  ],
  [/(:\s*)Basic\s+[A-Za-z0-9+/=]{8,}/gi, '$1Basic <token>'],
  // Anthropic / OpenAI-style keys
  [token('sk-ant-', '[A-Za-z0-9_-]', 8, mixedAlnum(8)), '<token>'],
  [token('sk-(?:proj|svcacct|admin)-', '[A-Za-z0-9_-]', 20, mixedAlnum(20)), '<token>'],
  [/\bsk-[A-Za-z0-9_-]{20,}/g, '<token>'],
  // AWS access key ids
  [/(^|[^A-Za-z0-9+])AKIA[A-Z0-9]{16}(?![A-Za-z0-9+=])/g, '$1<token>'],
  [/(^|[^A-Za-z0-9+])ASIA[A-Z0-9]{16}(?![A-Za-z0-9+=])/g, '$1<token>'],
  // GitHub
  [token('gh[opusr]_', '[A-Za-z0-9]', 20, hasDigit('[A-Za-z0-9]')), '<token>'],
  [/github_pat_[A-Za-z0-9_]{82,}/g, '<token>'],
  // Square, Facebook
  [/sq0(?:atp|csp)-[A-Za-z0-9_-]{22,}/g, '<token>'],
  [/(^|[^A-Za-z0-9+/])EAAA[A-Za-z0-9+/=%_-]{56,}/g, '$1<token>'],
  // GitLab
  [
    token(
      'gl(?:pat|dt|rt|ft|soat|oas|agent|ptt|cbt|imt|ffct)-',
      '[A-Za-z0-9_=-]',
      20,
      hasDigit('[A-Za-z0-9_=-]'),
      '(?:\\.[0-9a-z]{9})?'
    ),
    '<token>',
  ],
  // Slack
  [
    token(
      '(?:xox[abe-z](?:\\.xox[a-z])?|xapp|xwfp)-',
      SLACK_CHARS,
      10,
      '(?=[0-9])',
      '',
      hasDigit(SLACK_CHARS),
      'gi'
    ),
    '<token>',
  ],
  [
    new RegExp(
      `(?:\\bxox[cd]-${SLACK_CHARS}{10,}|xox[cd]-${hasDigit(SLACK_CHARS)}${SLACK_CHARS}{16,})`,
      'gi'
    ),
    '<token>',
  ],
  [
    /hooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9/_-]+/gi,
    'hooks.slack.com/<redacted>',
  ],
  // JWTs
  [/\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '<jwt>'],
  // Beyond the official set: URL userinfo and secret query parameters
  [/(\/\/[^\s/:@]+):[^\s/@]+@/g, '$1:<redacted>@'],
  [
    /([?&](?:password|passwd|pwd|secret|token|access_token|refresh_token|api_key|apikey|key|signature|sig)=)[^&#\s]+/gi,
    '$1<redacted>',
  ],
];

/** Mask credentials in `text`. */
export function redactSecrets(text: string): string {
  return RULES.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}
