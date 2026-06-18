import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";

const AUTH_MODES = ["login", "register", "forgot", "reset"] as const;
type AuthMode = (typeof AUTH_MODES)[number];

function isAuthMode(value: unknown): value is AuthMode {
	return typeof value === "string" && AUTH_MODES.includes(value as AuthMode);
}

export const Route = createFileRoute("/auth")({
	validateSearch: (search: Record<string, unknown>) => ({
		mode: isAuthMode(search.mode) ? search.mode : "login",
	}),
	component: AuthPage,
});

/* ─── Schemas ─── */

const loginSchema = z.object({
	email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
	password: z.string().min(8, "Mínimo de 8 caracteres"),
});

const registerSchema = z
	.object({
		name: z.string().min(2, "Mínimo de 2 caracteres"),
		email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
		password: z.string().min(8, "Mínimo de 8 caracteres"),
		confirmPassword: z.string().min(1, "Confirme sua senha"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "As senhas não coincidem",
		path: ["confirmPassword"],
	});

const forgotPasswordSchema = z.object({
	email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
});

const resetPasswordSchema = z
	.object({
		password: z.string().min(8, "Mínimo de 8 caracteres"),
		confirmPassword: z.string().min(1, "Confirme sua senha"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "As senhas não coincidem",
		path: ["confirmPassword"],
	});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const AUTH_PARTICLES = [0, 1, 2, 3, 4];

function firstFormError<T extends Record<string, unknown>>(
	errors: FieldErrors<T>,
): string {
	const first = Object.values(errors)[0];
	const message = first?.message;
	return typeof message === "string"
		? message
		: "Revise os campos destacados e tente novamente.";
}

/* ─── Page ─── */

function AuthPage() {
	const { mode: initialMode } = Route.useSearch();
	const [mode, setMode] = useState<AuthMode>(initialMode);
	const { session, loading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!loading && session && mode !== "reset") {
			void navigate({ to: "/dashboard", replace: true });
		}
	}, [loading, navigate, session, mode]);

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
			{/* Background effects */}
			<div className="pointer-events-none fixed inset-0 -z-20 arcane-grid opacity-[0.05]" />
			<div
				className="pointer-events-none fixed inset-0 -z-10"
				style={{
					background: `
						radial-gradient(ellipse 800px 500px at 30% 30%, oklch(0.66 0.20 290 / 0.10), transparent 60%),
						radial-gradient(ellipse 600px 400px at 70% 70%, oklch(0.55 0.20 320 / 0.07), transparent 60%)
					`,
				}}
			/>

			{/* Floating particles */}
			<div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
				{AUTH_PARTICLES.map((i) => (
					<div
						key={`auth-particle-${i}`}
						className="absolute h-1 w-1 rounded-full bg-primary/30"
						style={{
							left: `${10 + i * 20}%`,
							top: `${15 + (i % 3) * 30}%`,
							animation: `glow-pulse ${3 + i * 0.7}s ease-in-out infinite`,
							animationDelay: `${i * 0.5}s`,
						}}
					/>
				))}
			</div>

			{/* Back to landing */}
			<Link
				to="/"
				className="fixed left-5 top-5 z-50 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft className="h-3.5 w-3.5" />
				Voltar
			</Link>

			{/* Card */}
			<div className="w-full max-w-md">
				{/* Brand */}
				<div className="mb-8 flex flex-col items-center gap-3">
					<div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
						<svg
							width="24"
							height="24"
							viewBox="0 0 512 512"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
							focusable="false"
						>
							<path
								d="M126 182C211.8 182 297.6 182 386 182C384.507 185.733 383.049 188.83 381.051 192.262C380.458 193.285 379.865 194.307 379.254 195.361C378.613 196.459 377.973 197.557 377.312 198.688C376.638 199.849 375.963 201.012 375.289 202.174C373.889 204.587 372.487 207 371.084 209.412C367.875 214.933 364.689 220.467 361.5 226C360.25 228.167 359 230.333 357.75 232.5C357.131 233.572 356.512 234.645 355.875 235.75C334 273.667 312.125 311.583 290.25 349.5C289.631 350.574 289.011 351.647 288.373 352.753C287.13 354.909 285.886 357.064 284.643 359.219C281.755 364.223 278.868 369.228 275.983 374.233C274.974 375.983 273.964 377.734 272.955 379.484C271.698 381.664 270.442 383.844 269.186 386.023C268.038 388.014 266.887 390.003 265.734 391.991C264.503 394.128 263.285 396.273 262.078 398.423C261.454 399.523 260.83 400.624 260.188 401.758C259.624 402.762 259.061 403.766 258.48 404.801C257.748 405.89 257.748 405.89 257 407C256.34 407 255.68 407 255 407C254.391 405.932 254.391 405.932 253.769 404.842C244.51 388.612 235.212 372.405 225.863 356.227C223.98 352.965 222.099 349.701 220.219 346.438C214.196 335.983 208.155 325.54 202.062 315.125C196.641 305.855 191.298 296.542 185.981 287.212C180.78 278.087 175.52 268.999 170.217 259.933C164.071 249.424 157.994 238.876 151.917 228.326C149.959 224.929 147.998 221.535 146.035 218.141C134.821 198.742 134.821 198.742 129.562 189.438C129.191 188.782 128.819 188.127 128.436 187.453C126 183.12 126 183.12 126 182Z"
								fill="#6468F0"
							/>
							<path
								d="M255 0C258.088 1.34646 259.89 2.73481 261.996 5.35156C262.548 6.02969 263.1 6.70782 263.668 7.40649C264.252 8.1386 264.836 8.87071 265.438 9.625C266.053 10.3848 266.668 11.1446 267.302 11.9275C268.582 13.508 269.858 15.091 271.132 16.6763C273.398 19.4944 275.681 22.298 277.965 25.1011C280.111 27.7362 282.251 30.3762 284.391 33.0161C287.092 36.3461 289.796 39.6729 292.5 43C293.583 44.3333 294.667 45.6667 295.75 47C296.554 47.99 296.554 47.99 297.375 49C302.25 55 302.25 55 303.876 57.0012C304.956 58.3305 306.036 59.6598 307.116 60.989C309.875 64.3841 312.633 67.7796 315.391 71.1758C320.085 76.9574 324.781 82.7385 329.5 88.5C334.79 94.9574 340.049 101.439 345.311 107.919C347.502 110.618 349.693 113.315 351.885 116.013C352.961 117.336 354.036 118.66 355.111 119.983C357.891 123.407 360.674 126.828 363.461 130.246C366.649 134.158 369.829 138.075 373 142C373.782 142.968 374.565 143.936 375.371 144.934C376.012 145.739 376.652 146.545 377.312 147.375C377.845 148.043 378.377 148.71 378.926 149.398C380 151 380 151 380 153C298.16 153 216.32 153 132 153C134.249 147.378 134.249 147.378 136.539 144.801C137.033 144.237 137.526 143.673 138.035 143.092C138.56 142.505 139.084 141.918 139.625 141.312C140.724 140.057 141.822 138.801 142.918 137.543C143.451 136.934 143.984 136.324 144.533 135.697C147.055 132.78 149.437 129.758 151.828 126.734C154.588 123.26 157.387 119.817 160.188 116.375C160.74 115.696 161.293 115.016 161.862 114.316C163 112.917 164.138 111.518 165.277 110.119C166.989 108.014 168.7 105.907 170.41 103.801C175.808 97.1526 181.214 90.5115 186.641 83.8867C191.21 78.2954 195.759 72.6866 200.311 67.0806C203.04 63.7197 205.77 60.3599 208.5 57C209.583 55.6667 210.667 54.3333 211.75 53C218.25 45 224.75 37 231.25 29C232.056 28.0082 232.056 28.0082 232.878 26.9963C233.951 25.6752 235.025 24.354 236.099 23.033C238.958 19.5143 241.816 15.9943 244.672 12.4727C245.271 11.7347 245.869 10.9967 246.486 10.2363C247.642 8.81222 248.797 7.38776 249.951 5.96289C253.888 1.11246 253.888 1.11246 255 0Z"
								fill="#6468F0"
							/>
							<path
								d="M408 202C411.472 205.157 412.697 208.881 414.273 213.203C414.589 214.047 414.904 214.891 415.229 215.76C415.919 217.608 416.606 219.457 417.289 221.308C418.784 225.357 420.297 229.399 421.809 233.441C422.618 235.605 423.426 237.77 424.233 239.934C428.411 251.128 432.67 262.291 436.939 273.45C438.258 276.895 439.575 280.341 440.891 283.786C443.133 289.655 445.377 295.523 447.62 301.391C451.38 311.226 455.139 321.061 458.897 330.896C460.2 334.308 461.505 337.719 462.81 341.13C465.213 347.418 467.609 353.708 470 360C470.428 361.124 470.855 362.247 471.296 363.405C472.571 366.759 473.841 370.116 475.109 373.473C475.697 375.017 475.697 375.017 476.296 376.592C476.83 378.009 476.83 378.009 477.374 379.453C477.689 380.286 478.004 381.118 478.329 381.975C479 384 479 384 479 386C473.761 387.366 468.556 388.496 463.207 389.341C462.465 389.462 461.723 389.582 460.959 389.705C458.497 390.103 456.035 390.496 453.572 390.889C451.797 391.175 450.022 391.461 448.248 391.747C443.445 392.521 438.641 393.29 433.837 394.059C429.823 394.701 425.81 395.346 421.796 395.99C412.33 397.51 402.862 399.027 393.395 400.541C383.63 402.103 373.867 403.67 364.104 405.241C355.715 406.591 347.325 407.936 338.934 409.279C333.926 410.081 328.918 410.884 323.91 411.69C319.205 412.448 314.498 413.201 309.791 413.951C308.065 414.227 306.338 414.504 304.613 414.783C302.255 415.164 299.897 415.539 297.539 415.913C296.858 416.024 296.176 416.135 295.475 416.25C291.612 416.855 287.908 417.105 284 417C292.471 401.4 301.054 385.852 310.112 370.583C313.853 364.272 317.524 357.92 321.188 351.562C321.826 350.455 322.464 349.348 323.121 348.207C324.429 345.937 325.737 343.666 327.044 341.395C330.193 335.928 333.347 330.464 336.5 325C340.264 318.478 344.026 311.955 347.785 305.43C353.807 294.978 359.847 284.537 365.938 274.125C371.013 265.447 376.022 256.734 381 248C386.191 238.894 391.41 229.806 396.688 220.75C397.251 219.781 397.815 218.811 398.396 217.812C401.509 212.483 404.7 207.216 408 202Z"
								fill="#6468F0"
							/>
							<path
								d="M103 202C105.656 204.4 107.28 206.964 109.047 210.066C109.932 211.611 109.932 211.611 110.834 213.186C111.466 214.3 112.099 215.415 112.75 216.562C113.419 217.733 114.088 218.902 114.758 220.072C116.15 222.504 117.539 224.937 118.927 227.371C122.12 232.966 125.342 238.545 128.562 244.125C129.184 245.202 129.805 246.28 130.445 247.389C134.585 254.566 138.754 261.724 142.938 268.875C148.359 278.145 153.702 287.458 159.019 296.788C164.22 305.913 169.48 315.001 174.783 324.067C180.938 334.591 187.024 345.154 193.109 355.718C195.614 360.066 198.122 364.413 200.63 368.759C201.87 370.908 203.109 373.057 204.348 375.206C207.268 380.269 210.19 385.33 213.12 390.388C214.499 392.768 215.877 395.149 217.255 397.531C218.224 399.205 219.195 400.878 220.166 402.551C221.051 404.08 221.051 404.08 221.953 405.641C222.47 406.533 222.988 407.425 223.521 408.345C225.105 411.188 226.565 414.079 228 417C217.905 416.384 208.025 414.852 198.054 413.24C196.273 412.956 194.491 412.671 192.709 412.388C187.905 411.621 183.103 410.849 178.3 410.076C173.266 409.266 168.231 408.461 163.196 407.655C154.755 406.303 146.314 404.947 137.873 403.589C128.108 402.019 118.342 400.453 108.575 398.891C99.1722 397.387 89.7697 395.879 80.3674 394.369C76.3669 393.727 72.3661 393.086 68.3651 392.446C63.6647 391.694 58.9648 390.938 54.2654 390.18C52.5377 389.902 50.8099 389.625 49.0819 389.35C46.7311 388.974 44.3811 388.595 42.0312 388.214C41.341 388.105 40.6507 387.996 39.9396 387.883C35.2283 387.114 35.2283 387.114 33 386C34.8474 379.599 36.8955 373.336 39.2734 367.113C39.7467 365.863 39.7467 365.863 40.2295 364.587C41.2746 361.827 42.3247 359.07 43.375 356.312C44.1288 354.326 44.8824 352.34 45.6357 350.353C48.0847 343.9 50.5417 337.45 53 331C53.6218 329.368 53.6218 329.368 54.2562 327.703C59.4613 314.044 64.6766 300.389 69.8967 286.736C72.9464 278.759 75.9928 270.78 79.0368 262.8C80.2272 259.68 81.4178 256.559 82.6084 253.439C83.972 249.865 85.3355 246.291 86.6984 242.717C89.4598 235.476 92.2262 228.237 95 221C95.3553 220.072 95.7107 219.144 96.0768 218.188C97.0611 215.62 98.0493 213.054 99.0391 210.488C99.3277 209.735 99.6163 208.981 99.9137 208.204C101.885 203.115 101.885 203.115 103 202Z"
								fill="#6468F0"
							/>
							<path
								d="M27 142C30.9058 143.562 34.2195 145.163 37.8398 147.238C38.9758 147.888 40.1118 148.538 41.2822 149.207C42.5007 149.909 43.7192 150.611 44.9375 151.312C46.1858 152.029 47.4342 152.745 48.6826 153.461C59.8472 159.874 70.9418 166.405 82 173C81.3547 178.179 79.7842 182.662 77.9219 187.496C77.6032 188.336 77.2846 189.177 76.9563 190.042C75.8929 192.843 74.8214 195.64 73.75 198.438C72.992 200.429 72.2344 202.42 71.4773 204.412C69.424 209.809 67.3634 215.203 65.301 220.597C63.0951 226.367 60.8937 232.139 58.6914 237.91C56.0082 244.941 53.324 251.971 50.637 259C43.3808 277.983 36.1724 296.985 29 316C28.34 316 27.68 316 27 316C27 258.58 27 201.16 27 142Z"
								fill="#6468F0"
							/>
							<path
								d="M485 142C485 199.42 485 256.84 485 316C484.34 316 483.68 316 483 316C482.64 315.034 482.28 314.069 481.909 313.074C474.44 293.059 466.903 273.071 459.25 253.125C458.505 251.181 457.76 249.237 457.014 247.293C453.8 238.908 450.585 230.522 447.365 222.139C445.145 216.358 442.931 210.575 440.72 204.79C439.871 202.57 439.019 200.351 438.166 198.133C436.979 195.047 435.799 191.96 434.621 188.871C434.268 187.044 433.915 187.044 433.551 186.103C431.894 181.738 430.537 177.673 430 173C440.413 166.911 450.825 160.822 461.277 154.801C461.869 154.46 462.46 154.119 463.069 153.768C465.947 152.111 468.826 150.455 471.707 148.801C472.748 148.201 473.79 147.602 474.863 146.984C476.244 146.191 476.244 146.191 477.654 145.382C483.396 142 483.396 142 485 142Z"
								fill="#6468F0"
							/>
							<path
								d="M319 30C323.109 31.2576 326.654 32.7798 330.359 34.9492C331.379 35.5422 332.399 36.1352 333.449 36.7461C335.083 37.7071 335.083 37.7071 336.75 38.6875C337.907 39.3626 339.065 40.037 340.223 40.7109C342.626 42.1102 345.027 43.5119 347.428 44.9155C352.938 48.1345 358.47 51.3152 364 54.5C366.167 55.7498 368.333 56.9998 370.5 58.25C372.109 59.1781 372.109 59.1781 373.75 60.125C377 62 380.25 63.875 383.5 65.75C384.573 66.3688 385.645 66.9877 386.75 67.6252C388.916 68.8744 391.081 70.1235 393.246 71.3728C398.686 74.512 404.127 77.6499 409.57 80.7852C429.772 92.4246 449.917 104.158 470 116C467.223 118.989 464.561 121.011 460.984 122.961C459.991 123.509 458.998 124.056 457.975 124.621C456.379 125.489 456.379 125.489 454.75 126.375C447.823 130.18 440.931 134.006 434.152 138.066C433.067 138.715 431.981 139.364 430.862 140.032C428.775 141.285 426.693 142.547 424.618 143.82C423.676 144.383 422.733 144.947 421.762 145.527C420.936 146.03 420.111 146.533 419.26 147.051C417 148 417 148 414.89 147.858C412.6 146.818 411.57 145.709 410.004 143.746C409.452 143.065 408.9 142.383 408.332 141.681C407.748 140.941 407.164 140.2 406.562 139.438C405.947 138.673 405.332 137.909 404.698 137.121C403.417 135.531 402.141 133.937 400.868 132.34C398.609 129.51 396.323 126.703 394.035 123.897C392.425 121.922 390.819 119.944 389.215 117.965C385.98 113.974 382.74 109.987 379.5 106C376.202 101.942 372.905 97.8836 369.609 93.8242C364.915 88.0426 360.219 82.2615 355.5 76.5C351.351 71.4348 347.22 66.3554 343.094 61.2715C340.23 57.7433 337.363 54.2182 334.488 50.6992C333.914 49.9956 333.34 49.292 332.749 48.5671C331.664 47.2369 330.577 45.9075 329.489 44.5793C319 31.7109 319 31.7109 319 30Z"
								fill="#6468F0"
							/>
							<path
								d="M191 30C191.99 30.495 191.99 30.495 193 31C186.63 39.0058 180.18 46.9456 173.723 54.8813C172.011 56.9865 170.3 59.0926 168.59 61.1992C163.192 67.8474 157.786 74.4885 152.359 81.1133C147.79 86.7046 143.241 92.3134 138.689 97.9194C135.96 101.28 133.23 104.64 130.5 108C129.417 109.333 128.333 110.667 127.25 112C117.5 124 107.75 136 98 148C94.1944 147.419 91.4734 146.336 88.1758 144.367C86.7739 143.539 86.7739 143.539 85.3438 142.694C84.3434 142.094 83.3431 141.493 82.3125 140.875C80.1736 139.609 78.0343 138.343 75.8945 137.078C74.7764 136.415 73.6583 135.752 72.5063 135.068C67.1143 131.879 61.683 128.758 56.2533 125.634C54.5113 124.631 52.7698 123.628 51.0286 122.625C48.3527 121.082 45.6765 119.541 43 118C43 117.01 43 116.02 43 115C43.6316 114.649 44.2633 114.298 44.9141 113.937C58.667 106.29 72.3337 98.5191 85.9102 90.5625C92.2157 86.8679 98.5429 83.2115 104.875 79.5625C105.955 78.94 107.035 78.3174 108.148 77.676C110.338 76.4142 112.528 75.1526 114.718 73.8911C120.147 70.7632 125.573 67.6314 131 64.5C133.16 63.2539 135.32 62.0078 137.48 60.7617C142.991 57.5825 148.501 54.4009 154.01 51.2188C157.251 49.3479 160.495 47.4804 163.738 45.6133C167.912 43.2098 172.074 40.7891 176.23 38.3555C178.154 37.2369 180.077 36.1184 182 35C183.327 34.2156 183.327 34.2156 184.681 33.4153C185.487 32.9482 186.294 32.4812 187.125 32C187.829 31.5875 188.533 31.175 189.258 30.75C190.12 30.3787 190.12 30.3787 191 30Z"
								fill="#6468F0"
							/>
						</svg>
					</div>
					<div className="text-center leading-none">
						<span className="font-display text-base font-bold tracking-[0.18em] text-foreground">
							ARKHIVEON
						</span>
						<p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
							Arkhiveon
						</p>
					</div>
				</div>

				<div className="panel corner-mark p-6 sm:p-8">
					{/* Tabs */}
					{mode !== "forgot" && mode !== "reset" ? (
						<div className="mb-6 flex rounded-md border border-border bg-muted/50 p-0.5">
							<button
								type="button"
								onClick={() => setMode("login")}
								className={`flex-1 rounded-[5px] py-2 text-[13px] font-medium transition-all ${
									mode === "login"
										? "bg-card text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Entrar
							</button>
							<button
								type="button"
								onClick={() => setMode("register")}
								className={`flex-1 rounded-[5px] py-2 text-[13px] font-medium transition-all ${
									mode === "register"
										? "bg-card text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Criar Conta
							</button>
						</div>
					) : (
						<div className="mb-6">
							<button
								type="button"
								onClick={() => setMode("login")}
								className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground"
							>
								<ArrowLeft className="h-3 w-3" />
								Voltar para o login
							</button>
						</div>
					)}

					{mode === "login" && <LoginForm onForgot={() => setMode("forgot")} />}
					{mode === "register" && <RegisterForm />}
					{mode === "forgot" && <ForgotPasswordForm />}
					{mode === "reset" && <ResetPasswordForm />}
				</div>
			</div>
		</div>
	);
}

/* ─── Login Form ─── */

function LoginForm({ onForgot }: { onForgot: () => void }) {
	const { signIn } = useAuth();
	const toast = useToast();
	const [showPw, setShowPw] = useState(false);
	const emailId = useId();
	const passwordId = useId();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginValues>({
		resolver: zodResolver(loginSchema),
	});

	async function onSubmit(data: LoginValues) {
		const error = await signIn(data.email, data.password);
		if (error) {
			toast.error({
				title: "Não foi possível entrar",
				description: error,
			});
			return;
		}
		toast.success({
			title: "Login realizado",
			description: "Bem-vindo de volta ao Arkhiveon.",
		});
		// A navegação para /dashboard é feita pelo useEffect da AuthPage
		// quando ele detecta que session !== null — não usar window.location.assign
		// para evitar full page reload que causa o formulário piscar no dashboard.
	}

	function onInvalid(errors: FieldErrors<LoginValues>) {
		toast.error({
			title: "Complete o login",
			description: firstFormError(errors),
		});
	}

	return (
		<form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
			<div className="text-center mb-5">
				<h2 className="font-display text-lg font-bold text-foreground">
					Bem-vindo de volta
				</h2>
				<p className="mt-1 text-[12px] text-muted-foreground">
					Entre no Arkhiveon
				</p>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={emailId}>Email</Label>
				<Input
					id={emailId}
					type="email"
					placeholder="seu@email.com"
					autoComplete="email"
					spellCheck={false}
					{...register("email")}
					aria-invalid={!!errors.email}
				/>
				{errors.email && (
					<p className="text-[12px] text-destructive">{errors.email.message}</p>
				)}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={passwordId}>Senha</Label>
				<div className="relative">
					<Input
						id={passwordId}
						type={showPw ? "text" : "password"}
						placeholder="••••••••"
						autoComplete="current-password"
						spellCheck={false}
						className="pr-10"
						{...register("password")}
						aria-invalid={!!errors.password}
					/>
					<button
						type="button"
						onClick={() => setShowPw(!showPw)}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						tabIndex={-1}
						aria-label={showPw ? "Ocultar senha" : "Revelar senha"}
					>
						{showPw ? (
							<EyeOff className="h-4 w-4" />
						) : (
							<Eye className="h-4 w-4" />
						)}
					</button>
				</div>
				{errors.password && (
					<p className="text-[12px] text-destructive">
						{errors.password.message}
					</p>
				)}
			</div>
			<div className="flex justify-end">
				<button
					type="button"
					onClick={onForgot}
					className="text-[12px] text-primary hover:underline underline-offset-4"
				>
					Esqueceu a senha?
				</button>
			</div>

			<Button
				type="submit"
				className="w-full"
				size="lg"
				disabled={isSubmitting}
			>
				{isSubmitting ? "Entrando..." : "Entrar"}
			</Button>
		</form>
	);
}

/* ─── Register Form ─── */

function RegisterForm() {
	const { signUp } = useAuth();
	const toast = useToast();
	const [showPw, setShowPw] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [success, setSuccess] = useState(false);
	const nameId = useId();
	const emailId = useId();
	const passwordId = useId();
	const confirmPasswordId = useId();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<RegisterValues>({
		resolver: zodResolver(registerSchema),
	});

	async function onSubmit(data: RegisterValues) {
		const error = await signUp(data.name, data.email, data.password);
		if (error) {
			toast.error({
				title: "Não foi possível criar a conta",
				description: error,
			});
			return;
		}
		toast.success({
			title: "Conta criada",
			description: "Agora entre com seu email e senha para acessar.",
		});
		setSuccess(true);
	}

	function onInvalid(errors: FieldErrors<RegisterValues>) {
		toast.error({
			title: "Complete o cadastro",
			description: firstFormError(errors),
		});
	}

	if (success) {
		return (
			<div className="text-center space-y-4">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
					<CheckCircle2 className="h-6 w-6 text-emerald-400" />
				</div>
				<div>
					<h2 className="font-display text-lg font-bold text-foreground">
						Conta criada
					</h2>
					<p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
						Sua conta foi criada. Por segurança, faça login com seu email e
						senha para acessar o Arkhiveon.
					</p>
				</div>
				<Button
					type="button"
					className="w-full"
					onClick={() => window.location.assign("/auth?mode=login")}
				>
					Ir para o login
				</Button>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
			<div className="text-center mb-5">
				<h2 className="font-display text-lg font-bold text-foreground">
					Crie seu arquivo
				</h2>
				<p className="mt-1 text-[12px] text-muted-foreground">
					Registre-se e organize suas campanhas
				</p>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={nameId}>Nome</Label>
				<Input
					id={nameId}
					placeholder="Seu nome de aventureiro"
					autoComplete="username"
					spellCheck={false}
					{...register("name")}
					aria-invalid={!!errors.name}
				/>
				{errors.name && (
					<p className="text-[12px] text-destructive">{errors.name.message}</p>
				)}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={emailId}>Email</Label>
				<Input
					id={emailId}
					type="email"
					placeholder="seu@email.com"
					autoComplete="email"
					spellCheck={false}
					{...register("email")}
					aria-invalid={!!errors.email}
				/>
				{errors.email && (
					<p className="text-[12px] text-destructive">{errors.email.message}</p>
				)}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={passwordId}>Senha</Label>
				<div className="relative">
					<Input
						id={passwordId}
						type={showPw ? "text" : "password"}
						placeholder="Mínimo 8 caracteres"
						autoComplete="new-password"
						spellCheck={false}
						className="pr-10"
						{...register("password")}
						aria-invalid={!!errors.password}
					/>
					<button
						type="button"
						onClick={() => setShowPw(!showPw)}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						tabIndex={-1}
						aria-label={showPw ? "Ocultar senha" : "Revelar senha"}
					>
						{showPw ? (
							<EyeOff className="h-4 w-4" />
						) : (
							<Eye className="h-4 w-4" />
						)}
					</button>
				</div>
				{errors.password && (
					<p className="text-[12px] text-destructive">
						{errors.password.message}
					</p>
				)}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={confirmPasswordId}>Confirmar Senha</Label>
				<div className="relative">
					<Input
						id={confirmPasswordId}
						type={showConfirm ? "text" : "password"}
						placeholder="Repita a senha"
						autoComplete="new-password"
						spellCheck={false}
						className="pr-10"
						{...register("confirmPassword")}
						aria-invalid={!!errors.confirmPassword}
					/>
					<button
						type="button"
						onClick={() => setShowConfirm(!showConfirm)}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						tabIndex={-1}
						aria-label={showConfirm ? "Ocultar confirmação de senha" : "Revelar confirmação de senha"}
					>
						{showConfirm ? (
							<EyeOff className="h-4 w-4" />
						) : (
							<Eye className="h-4 w-4" />
						)}
					</button>
				</div>
				{errors.confirmPassword && (
					<p className="text-[12px] text-destructive">
						{errors.confirmPassword.message}
					</p>
				)}
			</div>
			<Button
				type="submit"
				className="w-full"
				size="lg"
				disabled={isSubmitting}
			>
				{isSubmitting ? "Criando conta..." : "Criar Conta"}
			</Button>

			<p className="text-center text-[11px] text-muted-foreground">
				Ao criar uma conta, você concorda com nossos{" "}
				<button
					type="button"
					className="text-primary hover:underline underline-offset-4"
				>
					Termos
				</button>{" "}
				e{" "}
				<button
					type="button"
					className="text-primary hover:underline underline-offset-4"
				>
					Privacidade
				</button>
			</p>
		</form>
	);
}

/* ─── Forgot Password Form ─── */

function ForgotPasswordForm() {
	const { resetPassword } = useAuth();
	const toast = useToast();
	const [success, setSuccess] = useState(false);
	const emailId = useId();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<ForgotPasswordValues>({
		resolver: zodResolver(forgotPasswordSchema),
	});

	async function onSubmit(data: ForgotPasswordValues) {
		const error = await resetPassword(data.email);
		if (error) {
			toast.error({
				title: "Não foi possível enviar o link",
				description: error,
			});
			return;
		}
		toast.success({
			title: "Link enviado",
			description: "Confira sua caixa de entrada para redefinir a senha.",
		});
		setSuccess(true);
	}

	function onInvalid(errors: FieldErrors<ForgotPasswordValues>) {
		toast.error({
			title: "Informe seu email",
			description: firstFormError(errors),
		});
	}

	if (success) {
		return (
			<div className="text-center space-y-4">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
					<CheckCircle2 className="h-6 w-6 text-emerald-400" />
				</div>
				<div>
					<h2 className="font-display text-lg font-bold text-foreground">
						Ritual de Recuperação Iniciado
					</h2>
					<p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
						Enviamos um link mágico para o seu e-mail. Verifique sua caixa de
						entrada para redefinir sua senha.
					</p>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
			<div className="text-center mb-5">
				<h2 className="font-display text-lg font-bold text-foreground">
					Recuperar Acesso
				</h2>
				<p className="mt-1 text-[12px] text-muted-foreground">
					Informe seu email para receber o link de redefinição
				</p>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={emailId}>Email</Label>
				<Input
					id={emailId}
					type="email"
					placeholder="seu@email.com"
					autoComplete="email"
					spellCheck={false}
					{...register("email")}
					aria-invalid={!!errors.email}
				/>
				{errors.email && (
					<p className="text-[12px] text-destructive">{errors.email.message}</p>
				)}
			</div>

			<Button
				type="submit"
				className="w-full"
				size="lg"
				disabled={isSubmitting}
			>
				{isSubmitting ? "Enviando..." : "Enviar Link"}
			</Button>
		</form>
	);
}

/* ─── Reset Password Form ─── */

function ResetPasswordForm() {
	const { updatePassword } = useAuth();
	const toast = useToast();
	const [showPw, setShowPw] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [success, setSuccess] = useState(false);
	const passwordId = useId();
	const confirmPasswordId = useId();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<ResetPasswordValues>({
		resolver: zodResolver(resetPasswordSchema),
	});

	const onSubmit = async (data: ResetPasswordValues) => {
		const errorMsg = await updatePassword(data.password);

		if (errorMsg) {
			toast.error({
				title: "Não foi possível redefinir a senha",
				description: errorMsg,
			});
			return;
		}
		toast.success({
			title: "Senha atualizada",
			description: "Agora você já pode entrar com a nova senha.",
		});
		setSuccess(true);
	};

	function onInvalid(errors: FieldErrors<ResetPasswordValues>) {
		toast.error({
			title: "Revise a nova senha",
			description: firstFormError(errors),
		});
	}

	if (success) {
		return (
			<div className="text-center space-y-4">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
					<CheckCircle2 className="h-6 w-6 text-emerald-400" />
				</div>
				<div>
					<h2 className="font-display text-lg font-bold text-foreground">
						Senha Reforjada
					</h2>
					<p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
						Sua nova senha foi gravada no Arkhiveon com sucesso. Agora você já
						pode entrar novamente.
					</p>
				</div>
				<Button
					className="w-full"
					onClick={() => {
						window.location.href = "/auth?mode=login";
					}}
				>
					Ir para o Login
				</Button>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
			<div className="text-center mb-5">
				<h2 className="font-display text-lg font-bold text-foreground">
					Nova Senha Arcaica
				</h2>
				<p className="mt-1 text-[12px] text-muted-foreground">
					Escolha uma nova combinação para proteger sua conta
				</p>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={passwordId}>Nova Senha</Label>
				<div className="relative">
					<Input
						id={passwordId}
						type={showPw ? "text" : "password"}
						placeholder="••••••••"
						autoComplete="new-password"
						spellCheck={false}
						className="pr-10"
						{...register("password")}
						aria-invalid={!!errors.password}
					/>
					<button
						type="button"
						onClick={() => setShowPw(!showPw)}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						tabIndex={-1}
						aria-label={showPw ? "Ocultar senha" : "Revelar senha"}
					>
						{showPw ? (
							<EyeOff className="h-4 w-4" />
						) : (
							<Eye className="h-4 w-4" />
						)}
					</button>
				</div>
				{errors.password && (
					<p className="text-[12px] text-destructive">
						{errors.password.message}
					</p>
				)}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={confirmPasswordId}>Confirmar Nova Senha</Label>
				<div className="relative">
					<Input
						id={confirmPasswordId}
						type={showConfirm ? "text" : "password"}
						placeholder="Repita a nova senha"
						autoComplete="new-password"
						spellCheck={false}
						className="pr-10"
						{...register("confirmPassword")}
						aria-invalid={!!errors.confirmPassword}
					/>
					<button
						type="button"
						onClick={() => setShowConfirm(!showConfirm)}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						tabIndex={-1}
						aria-label={showConfirm ? "Ocultar confirmação de senha" : "Revelar confirmação de senha"}
					>
						{showConfirm ? (
							<EyeOff className="h-4 w-4" />
						) : (
							<Eye className="h-4 w-4" />
						)}
					</button>
				</div>
				{errors.confirmPassword && (
					<p className="text-[12px] text-destructive">
						{errors.confirmPassword.message}
					</p>
				)}
			</div>

			<Button
				type="submit"
				className="w-full"
				size="lg"
				disabled={isSubmitting}
			>
				{isSubmitting ? "Atualizando..." : "Atualizar Senha"}
			</Button>
		</form>
	);
}
