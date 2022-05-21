import {
	getNetworkNodes,
	canHack,
	getThresholds,
	getRootAccess,
	canPenetrate
} from "./utils.js";

function getComparator(compareField) {
	return (a, b) => {
		if (a[compareField] > b[compareField]) {
			return -1;
		} else if (a[compareField] < b[compareField]) {
			return 1;
		} else {
			return 0;
		}
	};
}

/** @param {NS} ns **/
function getNodeInfo(ns, node) {
	var maxMoney = ns.getServerMaxMoney(node);
	var curMoney = ns.getServerMoneyAvailable(node);
	var reqHackLevel = ns.getServerRequiredHackingLevel(node);
	var security = ns.getServerSecurityLevel(node);
	var minSecurity = ns.getServerMinSecurityLevel(node);
	var moneyThresh = maxMoney * 0.75;
	var secThresh = minSecurity + 5;
	var reqPorts = ns.getServerNumPortsRequired(node);
	var hasRoot = ns.hasRootAccess(node);
	var maxRam = ns.getServerMaxRam(node);

	var server = ns.getServer(node);
	var player = ns.getPlayer();
	var hackChance = ns.formulas.hacking.hackChance(server, player);
	var revYield = maxMoney * hackChance;
	var strategy = getStrategy(ns, node);

	const nodeDetails = {
		node,
		maxMoney,
		maxRam,
		curMoney,
		reqHackLevel,
		security,
		minSecurity,
		secThresh,
		moneyThresh,
		reqPorts,
		hasRoot,
		hackChance,
		revYield,
	};
	for (var key of Object.keys(strategy)) {
		var value = strategy[key];
		nodeDetails['strategy.' + key] = value;
	}
	return nodeDetails;
}

// Strategy for thread allocation
export function getStrategy(ns, node) {
	var { moneyThresh, secThresh } = getThresholds(ns, node);
	var type = ''; // strategy name (for logging)
	var seq = []; // action sequence
	var allocation = []; // recommended allocation
	if (ns.getServerSecurityLevel(node) > secThresh) {
		type = 'flog';
		seq = ['g', 'w'];
		allocation = [0.3, 0.7];
	} else if (ns.getServerMoneyAvailable(node) < moneyThresh) {
		type = 'nourish';
		seq = ['g', 'w'];
		allocation = [0.6, 0.4];
	} else {
		type = 'plunder';
		seq = ['h', 'w', 'g', 'w'];
		allocation = [0.25, 0.25, 0.25, 0.25];
	}
	return {
		type,
		seq,
		allocation
	};
}

/** @param {NS} ns **/
export function getPotentialTargets(ns, compareField = "revYield") {
	const cracks = {
		"BruteSSH.exe": ns.brutessh,
		"FTPCrack.exe": ns.ftpcrack,
		"relaySMTP.exe": ns.relaysmtp,
		"HTTPWorm.exe": ns.httpworm,
		"SQLInject.exe": ns.sqlinject
	};

	var networkNodes = getNetworkNodes(ns);
	var hackableNodes = networkNodes.filter(node => {
		return canHack(ns, node) && canPenetrate(ns, node, cracks) && !node.includes("pserv")
	});

	// Prepare the servers to have root access
	for (var serv of hackableNodes) {
		if (!ns.hasRootAccess(serv)) {
			getRootAccess(ns, serv, cracks);
		}
	}

	var nodeDetails = hackableNodes.map(node => getNodeInfo(ns, node));
	var nodesDesc = nodeDetails
		.filter(node => node.maxMoney > 0)
		.sort(getComparator(compareField));
	return nodesDesc;
}

/** @param {NS} ns **/
export async function main(ns) {
	var compareField = ns.args[0]; // maxMoney | hackChance
	if (compareField === undefined) {
		compareField = "revYield";
	}
	var filename = "network-report.txt";

	async function writeNodesToFile(nodes) {
		var lines = [];
		for (var node of nodes) {
			for (var field of Object.keys(node)) {
				var value = node[field];
				lines.push(field + ": " + value);
			}
			lines.push("");
		}
		var fileContent = lines.join("\n");
		await ns.write(filename, fileContent, 'w');
		ns.alert(fileContent);
		ns.toast("Wrote targets to " + filename, "info", 3000);
	}
	var potentialTargets = getPotentialTargets(ns, compareField);
	await writeNodesToFile(potentialTargets);
}