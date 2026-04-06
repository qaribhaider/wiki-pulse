import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useWikiPulse } from '../hooks/useWikiPulse';

const Dashboard: React.FC = () => {
	const { metrics, alerts, status } = useWikiPulse();

	return (
		<div className="flex-1 p-4 md:p-6 overflow-y-auto lg:overflow-hidden flex flex-col gap-6 relative bg-background selection:bg-primary/30">
			{/* Background Grid Accent */}
			<div className="fixed inset-0 grid-bg pointer-events-none -z-10" />

			<header className="flex flex-col sm:flex-row justify-between items-start sm:items-end w-full gap-4 sm:gap-0">
				<h1 className="text-2xl font-bold tracking-[0.5em] text-primary">WIKI-PULSE</h1>
				
				<div className="flex flex-col items-start sm:items-end gap-1">
					<div id="system-status" className="flex items-center gap-3">
						<div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
							status === 'STREAMING' ? 'bg-primary shadow-[0_0_10px_#91d2d255]' : 
							status === 'INITIATING' ? 'bg-yellow-500 shadow-[0_0_10px_#eab30855]' : 
							status === 'CONNECTED' ? 'bg-white/40 shadow-none' :
							'bg-error shadow-[0_0_10px_#ffb4ab55]'
						}`} />
						<span className={`text-[10px] font-bold tracking-[0.3em] uppercase ${
							status === 'STREAMING' ? 'text-primary' : 
							status === 'INITIATING' ? 'text-yellow-500' : 
							status === 'CONNECTED' ? 'text-white/40' :
							'text-error'
						}`}>
							Status: {status}
						</span>
					</div>
					<span className="text-[8px] text-on-surface-variant opacity-50 tracking-widest font-mono">
						WINDOW: 60S SLIDING AGGREGATE
					</span>
				</div>
			</header>

			<main className="flex flex-col lg:flex-row gap-5 flex-1 lg:min-h-0">
				{/* Left Column (Identity & Session Load) */}
				<div className="lg:flex-[0.3] flex flex-col gap-5 lg:min-h-0">
					{/* 1. Origin Telemetry */}
					<section className="min-h-[350px] lg:min-h-0 lg:flex-[0.65] bg-surface/30 border border-outline-variant/10 p-5 relative flex flex-col overflow-hidden">
						<div className="absolute inset-0 bg-[linear-gradient(rgba(145,210,210,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
						<h2 className="text-on-surface-variant text-[12px] font-bold mb-6 tracking-[0.4em] uppercase opacity-70">
							Edit Volume By Identity
						</h2>

						<div className="flex-1 flex items-end justify-between px-4 gap-6 relative mt-4 mb-2">
							{[
								{ label: 'REGISTERED', val: metrics?.communityCount, total: metrics?.totalEdits, borderColor: 'border-primary', indicatorColor: 'bg-primary' },
								{ label: 'ANONYMOUS', val: metrics?.anonCount, total: metrics?.totalEdits, borderColor: 'border-white/40', indicatorColor: 'bg-white/40' },
								{ label: 'BOT_CORE', val: metrics?.botCount, total: metrics?.totalEdits, borderColor: 'border-white/40', indicatorColor: 'bg-white/40' }
							].map((bar, i) => (
								<div key={bar.label} className="flex-1 h-full flex flex-col items-center gap-4 group">
									<div className={`w-full flex-1 border ${bar.borderColor} relative flex items-end bg-transparent`}>
										<motion.div
											className="w-full relative z-10"
											initial={{ height: 0 }}
											animate={{
												height: `${Math.max(0, Math.min(100, ((bar.val || 0) / ((bar.total || 1) + 1)) * 100))}%`,
											}}
											transition={{ type: 'spring', damping: 25, delay: i * 0.1 }}
										>
											<div className={`absolute top-0 inset-x-0 h-[2px] ${bar.indicatorColor}`} />
										</motion.div>
									</div>
									<div className="flex flex-col items-center shrink-0">
										<span className="text-[11px] tracking-[0.2em] text-on-surface-variant font-bold uppercase truncate w-full text-center">
											{bar.label}
										</span>
										<span data-testid={`metric-${bar.label.toLowerCase()}`} className="text-[12px] font-mono text-primary/60 mt-0.5">
											{bar.val || 0}
										</span>
									</div>
								</div>
							))}
						</div>
					</section>

					{/* 2. User Identity / Session Load */}
					<section className="min-h-[300px] lg:min-h-0 lg:flex-[0.35] bg-surface/30 border border-outline-variant/10 p-5 flex flex-col relative">
						<h2 className="text-on-surface-variant text-[12px] font-bold mb-4 tracking-[0.4em] uppercase opacity-70">
							Active Session Load
						</h2>

						<div className="flex-1 flex items-center justify-between gap-10 px-4">
							<div className="relative w-36 h-36 border border-primary/20 flex items-center justify-center shrink-0">
								<div className="flex flex-col items-center">
									<motion.span 
										data-testid="total-sessions"
										className="text-primary text-4xl font-bold tracking-tighter"
										key={metrics?.uniqueUsers}
										initial={{ opacity: 0, scale: 0.95 }}
										animate={{ opacity: 1, scale: 1 }}
									>
										{metrics?.uniqueUsers || 0}
									</motion.span>
									<span className="text-[10px] text-on-surface-variant tracking-[0.5em] pl-[0.5em] mt-2 opacity-50 uppercase font-bold text-center w-full">
										TOTAL SESSIONS
									</span>
								</div>
							</div>

							<div className="flex-1 space-y-4 max-w-[200px]">
								{[
									{ label: 'COMMUNITY', val: ((metrics?.communityCount || 0) / (metrics?.humanCount || 1)) * 100 },
									{ label: 'ANONYMOUS', val: ((metrics?.anonCount || 0) / (metrics?.humanCount || 1)) * 100 }
								].map((row) => (
									<div key={row.label} className="flex justify-between items-center text-[11px] tracking-[0.3em] font-bold text-on-surface-variant/80">
										<div className="flex items-center gap-3">
											<div className="w-2 h-2 border border-white/60" />
											<span className="opacity-80 uppercase">{row.label}</span>
										</div>
										<span className="text-on-surface font-mono">{row.val.toFixed(0)}%</span>
									</div>
								))}
							</div>
						</div>
					</section>
				</div>

				{/* Right Column (Traffic & Radar) */}
				<div className="lg:flex-[0.7] flex flex-col gap-5 lg:min-h-0">
					{/* 3. Language Traffic */}
					<section className="min-h-[300px] lg:min-h-0 lg:flex-[0.35] bg-surface/30 border border-outline-variant/10 p-5 flex flex-col">
						<h2 className="text-on-surface-variant text-[12px] font-bold mb-4 tracking-[0.4em] uppercase opacity-70">
							Global Language Traffic
						</h2>
						<div className="flex-1 overflow-y-auto custom-scrollbar">
							<div className="grid grid-cols-2 gap-x-12 gap-y-4 pr-4">
								<AnimatePresence mode="popLayout">
									{(metrics?.topLanguages || []).slice(0, 8).map((lang, idx) => (
										<motion.div
											layout
											key={lang.wiki}
											className="flex items-center gap-4 border-b border-white/[0.03] pb-2"
											initial={{ opacity: 0, x: -10 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: idx * 0.05 }}
										>
											<span className="text-[11px] text-primary/50 w-6 font-mono">
												{(idx + 1).toString().padStart(2, '0')}
											</span>
											<span className="flex-1 text-on-surface/90 text-[11px] font-bold tracking-[0.1em] uppercase truncate">
												{lang.wiki.replace('wiki', '')}
											</span>
											<div className="w-16 h-[1px] bg-white/10 relative flex items-center shrink-0">
												<motion.div
													className="absolute left-0 h-[3px] bg-primary"
													initial={{ width: 0 }}
													animate={{
														width: `${(lang.count / (metrics?.totalEdits || 1)) * 100}%`,
													}}
												/>
											</div>
											<span data-testid={`lang-pct-${lang.wiki.replace('wiki', '')}`} className="text-on-surface-variant text-[10px] w-9 text-right opacity-60 font-mono shrink-0">
												{((lang.count / (metrics?.totalEdits || 1)) * 100).toFixed(0)}%
											</span>
										</motion.div>
									))}
								</AnimatePresence>
							</div>
						</div>
					</section>

					{/* 4. Intercept Radar */}
					<section className="min-h-[400px] lg:min-h-0 lg:flex-[0.65] bg-surface/10 border border-outline-variant/5 p-5 flex flex-col relative">
						<h2 className="text-on-surface-variant text-[12px] font-bold mb-4 tracking-[0.4em] uppercase opacity-70">
							Intercept Radar
						</h2>

						<div className="flex-1 overflow-y-auto custom-scrollbar space-y-[2px] pr-2">
							<AnimatePresence mode="popLayout">
								{alerts.length === 0 ? (
									<div className="h-24 flex items-center justify-center opacity-10 text-[12px] tracking-[0.8em] font-bold uppercase">
										Listening for intercept data...
									</div>
								) : (
									alerts.map((alert, _idx) => (
										<motion.div
											key={`${alert.title}-${alert.timestamp}-${_idx}`}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											className="grid grid-cols-12 items-center py-3 px-6 bg-white/[0.02] border-l-2 border-error/20 hover:bg-white/[0.04] transition-colors group"
										>
											<div className="col-span-9 flex flex-col">
												<span className="text-[12px] text-on-surface/90 font-bold tracking-tight truncate uppercase mb-0.5">
													ID: {Math.abs(alert.timestamp % 100000)} // "{alert.title}"
												</span>
												<div className="flex items-center gap-4">
													<span className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-[0.2em] font-mono">
														VELOCITY: {(alert.editCount / 10).toFixed(2)}
													</span>
													<span className="text-[10px] text-error/40 font-bold tracking-[0.4em] uppercase">
														ACTIVITY SPIKE
													</span>
												</div>
											</div>
											<div className="col-span-3 text-right">
												<span className="text-[10px] text-primary/30 font-mono tabular-nums">
													{new Date(alert.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
												</span>
											</div>
										</motion.div>
									))
								)}
							</AnimatePresence>
						</div>
					</section>
				</div>
			</main>
		</div>
	);
};

export default Dashboard;
