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
} from "./user-plan";

interface AuthContextValue {
	user: User | null;
	session: Session | null;
	loading: boolean;
	plan: UserPlan;
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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const supabase = getSupabase();
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);
	const suppressAutoSignInRef = useRef(false);
	const [plan, setPlan] = useState<UserPlan>("free");
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
			setPlan("free");
			setPlanLoading(false);
			return;
		}

		let mounted = true;
		setPlanLoading(true);

		loadCurrentUserPlan(userId)
			.then((nextPlan) => {
				if (mounted) setPlan(nextPlan);
			})
			.catch(() => {
				if (mounted) setPlan("free");
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
						setPlan("free");
						return;
					}
					setPlan(planFromRealtimeRow(payload.new));
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
			plan,
			isPro: plan === "pro",
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
				suppressAutoSignInRef.current = true;
				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: { name },
					},
				});
				if (error) {
					suppressAutoSignInRef.current = false;
					return error.message;
				}

				if (data.session) {
					const { error: signOutError } = await supabase.auth.signOut();
					if (signOutError) {
						suppressAutoSignInRef.current = false;
						return signOutError.message;
					}
				}
				setSession(null);
				return null;
			},
			signOut: async () => {
				if (!supabase) {
					setSession(null);
					return null;
				}
				const { error } = await supabase.auth.signOut();
				if (error) return error.message;
				setSession(null);
				return null;
			},
			resetPassword: async (email) => {
				if (!supabase) return "Supabase não está configurado.";
				const { error } = await supabase.auth.resetPasswordForEmail(email, {
					redirectTo: `${window.location.origin}/auth?mode=reset`,
				});
				return error?.message ?? null;
			},
			updatePassword: async (password) => {
				if (!supabase) return "Supabase não está configurado.";
				const { error } = await supabase.auth.updateUser({
					password,
				});
				return error?.message ?? null;
			},
		}),
		[loading, plan, planLoading, session, supabase],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const value = useContext(AuthContext);
	if (!value) {
		throw new Error("useAuth deve ser usado dentro de AuthProvider.");
	}
	return value;
}
