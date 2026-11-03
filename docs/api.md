# DummyJSON API

Base URL: `https://dummyjson.com` (env `VITE_API_BASE_URL`, so MSW / a mock can replace it). Docs: https://dummyjson.com/docs

## Endpoints used
| Area | Method + path | Used for | Notes |
|---|---|---|---|
| Auth | `POST /auth/login` `{ username, password, expiresInMins? }` | Login | Returns `accessToken`, `refreshToken`, `id`, `username`, `email`, `firstName`, `lastName`, `gender`, `image`. **No `role`** here → call `/auth/me` |
| Auth | `GET /auth/me` (Bearer) | Bootstrap + get `role` | Full user object |
| Auth | `POST /auth/refresh` `{ refreshToken, expiresInMins? }` | 401 recovery | Returns new token pair |
| Users | `GET /users/filter?key=role&value=user&select=username,password,role` | Find demo user account (G2, one-time, dev only) | Hardcode the result in `features/auth/demo-accounts.ts` |
| Products | `GET /products?limit=0&select=…` | Full catalog | ~194 items |
| Products | `GET /products/{id}` | Detail page (images, reviews, dimensions, policies) | |
| Products | `GET /products/categories` | Category filter + admin select | `{ slug, name, url }[]` |
| Products | `POST /products/add` | Admin create | **Simulated**, returns id = total+1 |
| Products | `PUT /products/{id}` | Admin update | **Simulated**, returns merged object |
| Products | `DELETE /products/{id}` | Admin delete | **Simulated**, returns object with `isDeleted`, `deletedOn` |
| Users | `GET /users?limit=0` | Admin users list | ~208 users, filtered/sorted client-side |
| Users | `POST /users/add`, `PUT /users/{id}`, `DELETE /users/{id}` | Admin user CRUD | **Simulated**, nothing persists; `role` is accepted in `UserInput` but not persisted (see `dummyjson.json` OpenAPI). Skipped for local ids |
| Carts | `POST /carts/add` `{ userId, products: [{ id, quantity }] }` | Checkout | **Simulated**, returns computed totals + id |

Reviews are not a separate endpoint: they are the `reviews[]` array inside `GET /products/{id}`. `/comments` is for posts and is not used.

Not used (on purpose): `GET /products/search` and `/products/category/{slug}` — search/filter run client-side over the merged catalog ([ADR-0004](decisions/0004-client-side-catalog.md)).

## Quirks to code around
1. **Nothing persists.** Every write must also go to the overlay store ([data-and-state.md](data-and-state.md)).
2. **Add returns a colliding id.** Assign local ids ≥ 100000.
3. **Update/delete on a local id** would hit a product that doesn't exist on the server → skip the network call for `isLocal(id)`.
4. **Login has no role.** (`moderator` exists as a role value but has no special behaviour in the app.) Always follow with `/auth/me`.
5. **Cookies.** Login/refresh also set cookies; we use Bearer headers only and do **not** set `withCredentials` (avoid CORS/cookie confusion).
6. **Tokens default to 60 min.** Send `expiresInMins: 60`; the refresh interceptor handles expiry. Test it by logging in with `expiresInMins: 1` in a dev flag.
7. **Images** are on `cdn.dummyjson.com`; admin-created products use a user-entered URL with a placeholder fallback (`onError`).

## Axios setup (`lib/http.ts`)
```ts
export const http = axios.create({ baseURL: env.VITE_API_BASE_URL, timeout: 15_000 });

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null; // single-flight, like StokMate client.ts
http.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || original._retried || original.url?.includes("/auth/")) {
    throw toAppError(error);
  }
  original._retried = true;
  refreshing ??= refreshTokens().finally(() => (refreshing = null));
  const token = await refreshing;
  if (!token) { useAuthStore.getState().logout(); throw toAppError(error); }
  original.headers.Authorization = `Bearer ${token}`;
  return http(original);
});
```

## Response validation
Each `api.ts` function parses responses with Zod (`productSchema.parse`) at the boundary, so a DummyJSON shape change fails loudly in one place instead of as `undefined` in the UI. Types are `z.infer` of those schemas — one source of truth (same idea as StokMate's generated `*.zod.ts`, written by hand here from [`dummyjson.json`](../dummyjson.json): the spec has no `required` lists or enums, so generated schemas would be all-optional; each schema cites its spec schema in a comment).

## Errors (`lib/http-error.ts`)
```ts
class AppError extends Error {
  constructor(public kind: "network" | "unauthorized" | "forbidden" | "not_found" | "validation" | "server", message: string, public status?: number) { super(message); }
}
```
UI maps `kind` → i18n message. DummyJSON error bodies are `{ message }`; we show it for 400 (e.g. "Invalid credentials") and a generic message otherwise.
