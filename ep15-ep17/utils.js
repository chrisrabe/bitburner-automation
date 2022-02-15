var homeServer = "home";

/** @param {NS} ns **/
export function getNetworkNodes(ns) {
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

/** @param {NS} ns **/
export function penetrate(ns, server, cracks) {
	ns.print("Penetrating " + server);
	for (var file of Object.keys(cracks)) {
		if (ns.fileExists(file, homeServer)) {
			var runScript = cracks[file];
			runScript(server);
		}
	}
}

/** @param {NS} ns **/
function getNumCracks(ns, cracks) {
	return Object.keys(cracks).filter(function (file) {
		return ns.fileExists(file, homeServer);
	}).length;
}

/** @param {NS} ns **/
export function canPenetrate(ns, server, cracks) {
	var numCracks = getNumCracks(ns, cracks);
	var reqPorts = ns.getServerNumPortsRequired(server);
	return numCracks >= reqPorts;
}

/** @param {NS} ns **/
export function hasRam(ns, server, scriptRam, useMax = false) {
	var maxRam = ns.getServerMaxRam(server);
	var usedRam = ns.getServerUsedRam(server);
	var ramAvail = useMax ? maxRam : maxRam - usedRam;
	return ramAvail > scriptRam;
}

/** @param {NS} ns **/
export function canHack(ns, server) {
	var pHackLvl = ns.getHackingLevel(); // player
	var sHackLvl = ns.getServerRequiredHackingLevel(server);
	return pHackLvl >= sHackLvl;
}

/** 
 * @param {NS} ns
 * @param {string[]} scripts
 **/
export function getTotalScriptRam(ns, scripts) {
	return scripts.reduce((sum, script) => {
		sum += ns.getScriptRam(script);
		return sum;
	}, 0)
}

/** @param {NS} ns **/
export function getRootAccess(ns, server, cracks) {
	var requiredPorts = ns.getServerNumPortsRequired(server);
	if (requiredPorts > 0) {
		penetrate(ns, server, cracks);
	}
	ns.print("Gaining root access on " + server);
	ns.nuke(server);
}


export function getThresholds(ns, node) {
	var moneyThresh = ns.getServerMaxMoney(node) * 0.75;
	var secThresh = ns.getServerMinSecurityLevel(node) + 5;
	return {
		moneyThresh,
		secThresh
	}
}
