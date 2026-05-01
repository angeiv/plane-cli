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
