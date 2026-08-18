import type { Session, User } from "@supabase/supabase-js";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { getSupabase, SUPABASE_TABLES } from "./supabase";
import {
	loadCurrentUserPlan,
	planFromRealtimeRow,
	type UserPlan,
	type UserPlanData,
} from "./user-plan";

interface AuthContextValue {
	user: User | null;
	session: Session | null;
	loading: boolean;
	plan: UserPlan;
	storageUsedBytes: number;
	isPro: boolean;
	planLoading: boolean;
	signIn: (email: string, password: string) => Promise<string | null>;
	signUp: (
		name: string,
		email: string,
		password: string,
	) => Promise<string | null>;
	signOut: () => Promise<string | null>;
	resetPassword: (email: string) => Promise<string | null>;
	updatePassword: (password: string) => Promise<string | null>;
	signInWithOAuth: (
		provider: "google" | "discord" | "github",
	) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const FALLBACK_AUTH_VALUE: AuthContextValue = {
	user: null,
	session: null,
	loading: true,
	plan: "free",
	storageUsedBytes: 0,
	isPro: false,
	planLoading: false,
	signIn: async () => "Supabase não está configurado.",
	signUp: async () => "Supabase não está configurado.",
	signOut: async () => null,
	resetPassword: async () => null,
	updatePassword: async () => null,
	signInWithOAuth: async () => null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
	const existingContext = useContext(AuthContext);
	if (existingContext) {
		return <>{children}</>;
	}

	return <AuthContextProvider>{children}</AuthContextProvider>;
}

function AuthContextProvider({ children }: { children: ReactNode }) {
	const supabase = getSupabase();
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);
	const suppressAutoSignInRef = useRef(false);
	const [planData, setPlanData] = useState<UserPlanData>({
		plan: "free",
		storageUsedBytes: 0,
	});
	const [planLoading, setPlanLoading] = useState(false);

	useEffect(() => {
		if (!supabase) {
			setLoading(false);
			return;
		}

		let mounted = true;

		supabase.auth.getSession().then(({ data }) => {
			if (!mounted) return;
			setSession(data.session);
			setLoading(false);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, nextSession) => {
			if (suppressAutoSignInRef.current && event === "SIGNED_IN") {
				setSession(null);
				setLoading(false);
				return;
			}

			setSession(nextSession);
			setLoading(false);
		});

		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, [supabase]);

	useEffect(() => {
		const userId = session?.user.id;
		if (!supabase || !userId) {
			setPlanData({ plan: "free", storageUsedBytes: 0 });
			setPlanLoading(false);
			return;
		}

		let mounted = true;
		setPlanLoading(true);

		loadCurrentUserPlan(userId)
			.then((nextPlanData) => {
				if (mounted) {
					setPlanData(nextPlanData);
					useRPGStore.getState().setUserPlan(nextPlanData.plan);
				}
			})
			.catch(() => {
				if (mounted) {
					setPlanData({ plan: "free", storageUsedBytes: 0 });
					useRPGStore.getState().setUserPlan("free");
				}
			})
			.finally(() => {
				if (mounted) setPlanLoading(false);
			});

		const channel = supabase
			.channel(`user-plan-${userId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: SUPABASE_TABLES.userPlans,
					filter: `user_id=eq.${userId}`,
				},
				(payload) => {
					if (payload.eventType === "DELETE") {
						setPlanData({ plan: "free", storageUsedBytes: 0 });
						useRPGStore.getState().setUserPlan("free");
						return;
					}
					const parsed = planFromRealtimeRow(payload.new);
					setPlanData(parsed);
					useRPGStore.getState().setUserPlan(parsed.plan);
				},
			)
			.subscribe();

		return () => {
			mounted = false;
			void supabase.removeChannel(channel);
		};
	}, [session?.user.id, supabase]);

	const value = useMemo<AuthContextValue>(
		() => ({
			user: session?.user ?? null,
			session,
			loading,
			plan: planData.plan,
			storageUsedBytes: planData.storageUsedBytes,
			isPro: planData.plan === "pro",
			planLoading,
			signIn: async (email, password) => {
				if (!supabase) return "Supabase não está configurado.";
				suppressAutoSignInRef.current = false;
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password,
				});
				return error?.message ?? null;
			},
			signUp: async (name, email, password) => {
				if (!supabase) return "Supabase não está configurado.";
				suppressAutoSignInRef.current = false;
				const { error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: { name },
					},
				});
				return error?.message ?? null;
			},
			signOut: async () => {
				if (!supabase) return "Supabase não está configurado.";
				suppressAutoSignInRef.current = true;
				const { error } = await supabase.auth.signOut();
				return error?.message ?? null;
			},
			resetPassword: async (email) => {
				if (!supabase) return "Supabase não está configurado.";
				const { error } = await supabase.auth.resetPasswordForEmail(email, {
					redirectTo: `${window.location.origin}/auth?mode=update-password`,
				});
				return error?.message ?? null;
			},
			updatePassword: async (password) => {
				if (!supabase) return "Supabase não está configurado.";
				const { error } = await supabase.auth.updateUser({ password });
				return error?.message ?? null;
			},
			signInWithOAuth: async (provider) => {
				if (!supabase) return "Supabase não está configurado.";
				const { error } = await supabase.auth.signInWithOAuth({
					provider,
					options: {
						redirectTo: `${window.location.origin}/dashboard`,
					},
				});
				return error?.message ?? null;
			},
		}),
		[loading, planData, planLoading, session, supabase],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const value = useContext(AuthContext);
	return value ?? FALLBACK_AUTH_VALUE;
}
