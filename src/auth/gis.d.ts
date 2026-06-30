declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(options?: { prompt?: string; hint?: string }): void
  }
  interface TokenResponse {
    access_token: string
    expires_in:   number
    scope:        string
    token_type:   string
    error?:       string
  }
  function initTokenClient(config: {
    client_id:       string
    scope:           string
    callback:        (resp: TokenResponse) => void
    error_callback?: (err: { type: string }) => void
  }): TokenClient
}

declare namespace google.accounts.id {
  function disableAutoSelect(): void
}

declare const google: typeof google
