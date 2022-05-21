import { getNetworkNodes, penetrate, canPenetrate, hasRam } from "./utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	var target = ns.args[0];
	var cracks = {
		"BruteSSH.exe": ns.brutessh,
		"FTPCrack.exe": ns.ftpcrack,
		"relaySMTP.exe": ns.relaysmtp,
		"HTTPWorm.exe": ns.httpworm,
		"SQLInject.exe": ns.sqlinject
	};

	var virus = "gimme-money.js";
	var virusRam = ns.getScriptRam(virus);

	async function copyAndRunVirus(server) {
		ns.print("Copying virus to server: " + server);
		await ns.scp(virus, server);

		if (!ns.hasRootAccess(server)) {
			var requiredPorts = ns.getServerNumPortsRequired(server);
			if (requiredPorts > 0) {
				penetrate(ns, server, cracks);
			}
			ns.print("Gaining root access on " + server);
			ns.nuke(server);
		}

		if (ns.scriptRunning(virus, server)) {
			ns.scriptKill(virus, server);
		}

		var maxThreads = Math.floor(ns.getServerMaxRam(server) / virusRam);
		ns.exec(virus, server, maxThreads, target);
	}

	function getTargetServers() {
		var networkNodes = getNetworkNodes(ns);
		var targets = networkNodes.filter(function (node) {
			return canPenetrate(ns, node, cracks) && hasRam(ns, node, virusRam);
		});
		return targets;
	}

	async function deployHacks(targets) {
		ns.tprint("Gonna deploy virus to these servers " + targets);
		for (var serv of targets) {
			await copyAndRunVirus(serv);
		}
	}

	var curTargets = [];
	var waitTime = 2000;

	while (true) {
		var newTargets = getTargetServers();
		if (newTargets.length !== curTargets.length) {
			await deployHacks(newTargets);
			curTargets = newTargets;
		}
		await ns.sleep(waitTime);
	}
}