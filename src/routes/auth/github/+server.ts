import { redirect } from '@sveltejs/kit';
import { GitHub, generateState } from 'arctic';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const github = new GitHub(
		env.GITHUB_CLIENT_ID ?? '',
		env.GITHUB_CLIENT_SECRET ?? '',
		`${env.ORIGIN}/auth/github/callback`
	);

	const state = generateState();
	const url = github.createAuthorizationURL(state, ['read:user', 'user:email']);

	cookies.set('github_oauth_state', state, {
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	redirect(302, url.toString());
};
