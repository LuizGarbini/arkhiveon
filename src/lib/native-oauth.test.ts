import { describe, expect, it } from "vitest";
import { NATIVE_OAUTH_REDIRECT, parseOAuthCallback } from "./native-oauth";

describe("parseOAuthCallback", () => {
	it("ignora URLs de outro scheme", () => {
		expect(
			parseOAuthCallback("https://arkhiveon.com.br/dashboard?code=x"),
		).toBeNull();
	});
	it("lê code PKCE", () => {
		expect(parseOAuthCallback(`${NATIVE_OAUTH_REDIRECT}?code=abc`)).toEqual({
			kind: "code",
			code: "abc",
		});
	});
	it("lê tokens implicit do hash", () => {
		expect(
			parseOAuthCallback(
				`${NATIVE_OAUTH_REDIRECT}#access_token=a&refresh_token=r&type=bearer`,
			),
		).toEqual({
			kind: "tokens",
			accessToken: "a",
			refreshToken: "r",
		});
	});
	it("lê erro", () => {
		expect(
			parseOAuthCallback(
				`${NATIVE_OAUTH_REDIRECT}?error=access_denied&error_description=negado`,
			),
		).toEqual({
			kind: "error",
			message: "negado",
		});
	});
});
