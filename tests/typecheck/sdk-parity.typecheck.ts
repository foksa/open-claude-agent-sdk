import type * as Official from '@anthropic-ai/claude-agent-sdk';
import type * as Open from '../../src/types/index.ts';

type Assert<T extends true> = T;

type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;

type PromiseValue<T> = T extends Promise<infer U> ? U : never;

type OfficialInit = PromiseValue<ReturnType<Official.Query['initializationResult']>>;

type _SDKRateLimitEventParity = Assert<IsEqual<Open.SDKRateLimitEvent, Official.SDKRateLimitEvent>>;
type _SDKPromptSuggestionMessageParity = Assert<
  IsEqual<Open.SDKPromptSuggestionMessage, Official.SDKPromptSuggestionMessage>
>;
type _SDKLocalCommandOutputMessageParity = Assert<
  IsEqual<Open.SDKLocalCommandOutputMessage, Official.SDKLocalCommandOutputMessage>
>;
type _SDKElicitationCompleteMessageParity = Assert<
  IsEqual<Open.SDKElicitationCompleteMessage, Official.SDKElicitationCompleteMessage>
>;
type _SDKControlInitializeResponseParity = Assert<
  IsEqual<Open.SDKControlInitializeResponse, OfficialInit>
>;
