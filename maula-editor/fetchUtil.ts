/** Wrapper around fetch that always sends httpOnly cookies */
export function fetchWithCredentials(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return fetch(input, { ...init, credentials: 'include' });
}
