import type { RequestHandler } from './$types';

// Used by nginx auth_request to validate Kenari session
// Returns 200 if authenticated, 401 if not
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	return new Response('OK', { status: 200 });
};
