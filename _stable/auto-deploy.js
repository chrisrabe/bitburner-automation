import {
	getNetworkNodes,
	canPenetrate,
	hasRam,
	getRootAccess,
} from "./utils.js";

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
		ns.killall(server);
		var maxThreads = Math.floor(ns.getServerMaxRam(server) / virusRam);
		ns.exec(virus, server, maxThreads, target);
	}

	function getTargetServers() {
		var networkNodes = getNetworkNodes(ns);
		var hackableNodes = networkNodes.filter(function (node) {
			if (node === ns.getHostname()) {
				return false;
			}
			return canPenetrate(ns, node, cracks);
		});

		// Get root access if they can be penetrated
		for (const node of hackableNodes) {
			if (!ns.hasRootAccess(node)) {
				getRootAccess(ns, node, cracks);
			}
		}

		// Filter ones we can run scripts on
		var targets = hackableNodes.filter(function (node) {
			return hasRam(ns, node, virusRam, true);
		});

		// Add purchased servers
		var i = 0;
		var servPrefix = "pserv-";
		while(ns.serverExists(servPrefix + i)) {
			targets.push(servPrefix + i);
			++i;
		}

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