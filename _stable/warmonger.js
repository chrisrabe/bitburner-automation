import { pushToInputPort, checkForEvent } from "./port-utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	const port = ns.args[0];
	const delay = ns.args[1];

	const reqEvent = "reqAttack";
	const resEvent = "resAttack";

	const virus = "pirate.js";

	function logShipAction(ship, action, target) {
		let variant = "INFO";
		let icon = "💵";
		if (action === "weaken") {
			variant = "ERROR";
			icon = "☠️";
		} else if (action === "grow") {
			variant = "SUCCESS";
			icon = "🌱";
		}
		ns.print(`${variant}\t ${icon} ${action} @ ${ship.serv} (${ship.threads}) -> ${target}`);
	}

	function wageWar(target, fleets, reqId) {
		for (const fleet of fleets) {
			const action = fleet.action;
			for (const ship of fleet.ships) {
				if (ship.threads < 1) {
					continue; // skip
				}
				let pid = 0;
				while (ns.exec(virus, ship.serv, ship.threads, action, target, ship.delay, pid) === 0) {
					pid++;
				}
				logShipAction(ship, action, target);
			}
		}
		pushToInputPort(ns, resEvent, reqId, {}, port); // send response as done
	}

	while (true) {
		const event = checkForEvent(ns, reqEvent);
		if (event) {
			const reqId = event.reqId;
			const data = event.data;
			wageWar(data.target, data.fleets, reqId);
		}
		await ns.sleep(delay);
	}
}