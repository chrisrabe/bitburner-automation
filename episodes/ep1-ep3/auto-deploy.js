/** @param {NS} ns **/
export async function main(ns) {
	var target = ns.args[0];
	var homeServer = "home";
	var cracks = {
		"BruteSSH.exe": ns.brutessh,
		"FTPCrack.exe": ns.ftpcrack,
		"relaySMTP.exe": ns.relaysmtp,
		"HTTPWorm.exe": ns.httpworm,
		"SQLInject.exe": ns.sqlinject
	};

	var virus = "gimme-money.js"
	var virusRam = ns.getScriptRam(virus);

	function getNumCracks() {
		return Object.keys(cracks).filter(function (file) {
			return ns.fileExists(file, homeServer);
		}).length;
	}

	function penetrate(server) {
		ns.print("Penetrating " + server);
		for (var file of Object.keys(cracks)) {
			if (ns.fileExists(file, homeServer)) {
				var runScript = cracks[file];
				runScript(server);
			}
		}
	}

	async function copyAndRunVirus(server) {
		ns.print("Copying virus to server: " + server);
		await ns.scp(virus, server);

		if (!ns.hasRootAccess(server)) {
			var requiredPorts = ns.getServerNumPortsRequired(server);
			if (requiredPorts > 0) {
				penetrate(server);
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

	// Retrieves all nodes in the network using DFS
	function getNetworkNodes() {
		ns.print("Retrieving all nodes in the network");
		var visited = {};
		var stack = [];
		var origin = ns.getHostname();
		stack.push(origin);

		while (stack.length > 0) {
			var node = stack.pop();
			if (!visited[node]) {
				visited[node] = node;
				var neighbours = ns.scan(node);
				for (var i = 0; i < neighbours.length; i++) {
					var child = neighbours[i];
					if (visited[child]) {
						continue;
					}
					stack.push(child);
				}
			}
		}
		return Object.keys(visited);
	}

	function canHack(server) {
		var numCracks = getNumCracks();
		var reqPorts = ns.getServerNumPortsRequired(server);
		var ramAvail = ns.getServerMaxRam(server);
		return numCracks >= reqPorts && ramAvail > virusRam;
	}

	function getTargetServers() {
		var networkNodes = getNetworkNodes();
		const targets = networkNodes.filter(function (node) { return canHack(node); });
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

	while(true) {
		var newTargets = getTargetServers();
		if (newTargets.length !== curTargets.length) {
			await deployHacks(newTargets);
			curTargets = newTargets;
		}
		await ns.sleep(waitTime);
	}
}