import { getNetworkNodes, canHack } from "./utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	var compareField = ns.args[0]; // maxMoney | hackChance
	if (compareField === undefined) {
		compareField = "maxMoney";
	}
	var player = ns.getPlayer();
	var filename = "network-report.txt";
	
	function getNodeInfo(node) {
		var server = ns.getServer(node);
		var maxMoney = ns.getServerMaxMoney(node);
		var chance = ns.formulas.hacking.hackChance(server, player);
		chance = chance * 100;
		chance = Math.round((chance + Number.EPSILON) * 100) / 100;
		chance = chance + "%"
		var reqHackLevel = ns.getServerRequiredHackingLevel(node);
		return {
			node,
			maxMoney,
			hackChance: chance,
			reqHackLevel
		};
	}

	async function writeNodesToFile(nodes) {
		var lines = [];
		for (var node of nodes) {
			for(var field of Object.keys(node)) {
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

	function getComparator() {
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

	var networkNodes = getNetworkNodes(ns);
	var hackableNodes = networkNodes.filter(node => canHack(ns, node) && !node.includes("pserv"));
	var nodeDetails = hackableNodes.map(node => getNodeInfo(node));
	var nodeAsc = nodeDetails.sort(getComparator());
	await writeNodesToFile(nodeAsc);
}
