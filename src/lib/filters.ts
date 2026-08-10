import type { ResponseFilters } from "@/lib/responses";

/** Shared parsing of dashboard filters from a request URL. */
export function filtersFromSearchParams(
  params: URLSearchParams,
): ResponseFilters {
  const list = (key: string) =>
    params
      .getAll(key)
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);

  const organizations = list("organization");
  const functionRoles = list("role");
  const from = params.get("from");
  const to = params.get("to");

  return {
    organizations: organizations.length ? organizations : undefined,
    functionRoles: functionRoles.length ? functionRoles : undefined,
    from: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
    to: to ? new Date(`${to}T23:59:59.999Z`) : undefined,
    excludeStraightLined: params.get("excludeStraightLined") === "true",
    includeDemo: params.get("includeDemo") === "false" ? false : undefined,
  };
}
