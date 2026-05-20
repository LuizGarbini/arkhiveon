type ArkhiveonGradientBackgroundProps = {
	className?: string;
};

export function ArkhiveonGradientBackground({
	className = "",
}: ArkhiveonGradientBackgroundProps) {
	return (
		<div
			aria-hidden="true"
			className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#10081f] ${className}`}
		>
			<div className="absolute inset-0 bg-[linear-gradient(135deg,#140923_0%,#090611_42%,#211045_100%)]" />
			<div className="arkhiveon-gradient-blob absolute -left-[20%] -top-[30%] h-[78%] w-[78%] rounded-full bg-[radial-gradient(circle,rgba(126,74,255,0.44)_0%,rgba(86,38,180,0.24)_38%,transparent_70%)] blur-3xl" />
			<div className="arkhiveon-gradient-blob arkhiveon-gradient-blob-delay absolute -right-[18%] top-[-8%] h-[82%] w-[74%] rounded-full bg-[radial-gradient(circle,rgba(178,88,255,0.38)_0%,rgba(96,42,190,0.24)_42%,transparent_74%)] blur-3xl" />
			<div className="arkhiveon-gradient-blob arkhiveon-gradient-blob-slow absolute bottom-[-34%] left-[18%] h-[66%] w-[66%] rounded-full bg-[radial-gradient(circle,rgba(75,31,138,0.42)_0%,rgba(37,18,74,0.24)_44%,transparent_72%)] blur-3xl" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.07),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_24%,rgba(0,0,0,0.34)_100%)]" />
		</div>
	);
}
