/**
 * Stderr redaction: token shapes the official SDK masks, plus URL userinfo
 * and secret query parameters. Samples are assembled at runtime so no
 * credential-shaped literal sits in the repo.
 */

import { describe, expect, test } from 'bun:test';
import { redactSecrets } from '../../src/core/redact.ts';

const alnum = (n: number) => 'a1B2c3D4e5'.repeat(Math.ceil(n / 10)).slice(0, n);

const samples: Array<[string, string]> = [
  ['Anthropic key', `sk-ant-api03-${alnum(40)}`],
  ['OpenAI project key', `sk-proj-${alnum(40)}`],
  ['generic sk- key', `sk-${alnum(32)}`],
  ['AWS access key id', `AKIA${'ABCDEFGH23456789'}`],
  ['AWS session key id', `ASIA${'ABCDEFGH23456789'}`],
  ['GitHub token', `ghp_${alnum(36)}`],
  ['GitHub fine-grained PAT', `github_pat_${alnum(82)}`],
  ['GitLab token', `glpat-${alnum(20)}`],
  ['Slack bot token', `xoxb-${alnum(12)}-${alnum(24)}`],
  ['Slack webhook', `https://hooks.slack.com/services/T000/B000/${alnum(24)}`],
  ['JWT', `eyJ${alnum(20)}.eyJ${alnum(30)}.${alnum(40)}`],
  ['Bearer header', `Authorization: Bearer ${alnum(30)}`],
  ['Basic header', `Authorization: Basic ${alnum(24)}`],
  ['URL userinfo', `https://user:${alnum(16)}@example.com/repo.git`],
  ['password query param', `https://example.com/cb?user=x&password=${alnum(16)}&z=1`],
  ['api_key query param', `https://example.com/v1?api_key=${alnum(16)}`],
];

describe('redactSecrets', () => {
  for (const [name, sample] of samples) {
    test(`masks ${name}`, () => {
      const secret = sample.match(/[A-Za-z0-9]{16,}/g)?.at(-1) ?? sample;
      const out = redactSecrets(`error: failed with ${sample} (retrying)`);
      expect(out).not.toContain(secret);
      expect(out).toStartWith('error: failed with ');
      expect(out).toEndWith(' (retrying)');
    });
  }

  test('leaves ordinary diagnostics alone', () => {
    const text =
      'Error: ENOENT: no such file or directory, open /Users/me/project/settings.json at task-1234 (skeleton)';
    expect(redactSecrets(text)).toBe(text);
  });
});
