export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: { msg: string }[];
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit & { noRedirect?: boolean } = {},
): Promise<ApiResponse<T>> {
  const { noRedirect, ...fetchOptions } = options;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...fetchOptions.headers },
    credentials: 'include',
    ...fetchOptions,
  });

  if (res.status === 401 && !noRedirect) {
    window.location.href = '/login.html';
    return { success: false, error: 'Unauthorized' };
  }

  const data = await res.json().catch(() => ({ success: false, error: 'Invalid response' }));
  return data as ApiResponse<T>;
}

export async function apiFetchForm<T = unknown>(
  url: string,
  formData: FormData,
  method = 'POST',
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    method,
    body: formData,
    credentials: 'include',
  });

  if (res.status === 401) {
    window.location.href = '/login.html';
    return { success: false, error: 'Unauthorized' };
  }

  return res.json() as Promise<ApiResponse<T>>;
}
