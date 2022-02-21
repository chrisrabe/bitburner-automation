import {
	getNetworkNodes,
	canPenetrate,
	getRootAccess,
	hasRam,
} from "./utils.js";
import { pushToInputPort, checkForEvent } from "./port-utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	const port = ns.args[0];
	const delay = ns.args[1];
	const homeServ = "home";

	const reqEvent = "reqShips"; // request event
	const resEvent = "resShips"; // response event

	var cracks = {
		"BruteSSH.exe": ns.brutessh,
		"FTPCrack.exe": ns.ftpcrack,
		"relaySMTP.exe": ns.relaysmtp,
		"HTTPWorm.exe": ns.httpworm,
		"SQLInject.exe": ns.sqlinject
	};

	const virus = "pirate.js";
	const virusRam = ns.getScriptRam(virus);

	// Returns list of controllable servers
	async function getShips() {
		const nodes = getNetworkNodes(ns);
		const servers = nodes.filter(node => {
			if (node === homeServ) {
				return false; // don't execute on home server
			}
			return canPenetrate(ns, node, cracks) && hasRam(ns, node, virusRam);
		});

		// Prepare the servers to have root access and scripts
		for (const serv of servers) {
			if (!ns.hasRootAccess(serv)) {
				getRootAccess(ns, serv, cracks);
			}
			await ns.scp(virus, serv);
		}

		// Add purchased servers
		var i = 0;
		var servPrefix = "pserv-";
		while (ns.serverExists(servPrefix + i)) {
			servers.push(servPrefix + i);
			++i;
		}

		const serversWithRamLeft = servers.filter(node => {
			const maxRam = ns.getServerMaxRam(node);
			const curRam = ns.getServerUsedRam(node);
			const ramLeft = maxRam - curRam;
			return ramLeft >= virusRam;
		})

		// Map servers to available ram
		return serversWithRamLeft.reduce((acc, node) => {
			const maxRam = ns.getServerMaxRam(node);
			const curRam = ns.getServerUsedRam(node);
			acc[node] = maxRam - curRam;
			return acc;
		}, {});
	}

	async function respondToRequest(reqId) {
		const ships = await getShips();
		pushToInputPort(ns, resEvent, reqId, ships, port);
	}

	while (true) {
		const event = checkForEvent(ns, reqEvent);
		if (event) {
			const reqId = event.reqId;
			ns.print("WARN\tReceived request with request ID: " + reqId)
			await respondToRequest(reqId);
		}
		await ns.sleep(delay);
	}
}