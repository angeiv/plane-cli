import type { PaginatedResponse } from "../plane/types.js";

/**
 * Paginate through all pages until a predicate finds a match.
 * Returns as soon as the predicate returns a non-undefined value.
 */
export async function findByPagination<T, R>(
	fetchPage: (cursor?: string) => Promise<PaginatedResponse<T>>,
	predicate: (item: T) => R | undefined,
): Promise<R | undefined> {
	let cursor: string | undefined;
	do {
		const page = await fetchPage(cursor);
		for (const item of page.results) {
			const result = predicate(item);
			if (result !== undefined) return result;
		}
		cursor = page.next_cursor ?? undefined;
		if (!page.next_page_results) break;
	} while (cursor);
	return undefined;
}

/**
 * Paginate through all pages collecting every result into a flat array.
 */
export async function collectAllPages<T>(
	fetchPage: (cursor?: string) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
	const all: T[] = [];
	let cursor: string | undefined;
	do {
		const page = await fetchPage(cursor);
		all.push(...page.results);
		cursor = page.next_cursor ?? undefined;
		if (!page.next_page_results) break;
	} while (cursor);
	return all;
}

/**
 * Auto-paginate and collect up to `limit` items.
 *
 * Design follows `gh` CLI: `--limit` is a global cap on total items returned,
 * not a per-page size. Internally fetches pages of `pageSize` until the
 * limit is reached or there is no more data.
 *
 * @param fetchPage - function that fetches one page given a cursor
 * @param limit - maximum number of items to return (0 = all)
 * @param pageSize - internal page size for each API call (default 50)
 */
export async function collectUpToLimit<T>(
	fetchPage: (
		cursor?: string,
		pageSize?: number,
	) => Promise<PaginatedResponse<T>>,
	limit: number,
	pageSize = 50,
): Promise<T[]> {
	if (limit <= 0)
		return collectAllPages((cursor) => fetchPage(cursor, pageSize));

	const all: T[] = [];
	let cursor: string | undefined;
	do {
		const remaining = limit - all.length;
		const effectivePageSize = Math.min(pageSize, remaining);
		const page = await fetchPage(cursor, effectivePageSize);
		all.push(...page.results);
		cursor = page.next_cursor ?? undefined;
		if (!page.next_page_results) break;
		if (all.length >= limit) break;
	} while (cursor);
	return all.slice(0, limit);
}
