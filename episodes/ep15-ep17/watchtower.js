import { getPotentialTargets } from "./find-targets.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	const compareType = ns.args[0];
	const waitTime = 2000;
	const logLimit = 50;

	while (true) {
		ns.clearLog();
		const targets = getPotentialTargets(ns, compareType);
		const printedTargets = targets.length < logLimit
		 ? targets : targets.slice(0, logLimit);
		for (const target of printedTargets) {
			const node = target.node;
			const strategy = target["strategy.type"];
			let variant = "INFO";
			let icon = "💵";
			if (strategy === "flog") {
				variant = "ERROR";
				icon = "☠️";
			} else if (strategy === "nourish") {
				variant = "SUCCESS";
				icon = "🌱";
			}
			ns.print(`${variant}\t${icon} ${strategy} @ ${node} (${target.reqHackLevel})`);
		}
		await ns.sleep(waitTime);
	}
}