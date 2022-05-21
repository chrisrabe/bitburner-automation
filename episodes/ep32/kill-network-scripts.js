const flagOptions = {
	includeHome: false
}

/** @param {NS} ns */
export async function main(ns) {
	const homeServ = "home";
	const pServPrefix = "pserv-";

	const options = ns.flags(Object.keys(flagOptions).map(key => [key, flagOptions[key]]));

	const cracks = {
		"BruteSSH.exe": ns.brutessh,
		"FTPCrack.exe": ns.ftpcrack,
		"relaySMTP.exe": ns.relaysmtp,
		"HTTPWorm.exe": ns.httpworm,
		"SQLInject.exe": ns.sqlinject
	};

	const getNetworkNodes = () => {
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

	const getNumCracks = () => {
		return Object.keys(cracks).filter(function (file) {
			return ns.fileExists(file, homeServ);
		}).length;
	}

	function canPenetrate(server) {
		var numCracks = getNumCracks();
		var reqPorts = ns.getServerNumPortsRequired(server);
		return numCracks >= reqPorts;
	}

	const getCrackableNetworkServers = () => {
		const networkNodes = getNetworkNodes();
		const hackableServers = networkNodes.filter(node => {
			if (node == homeServ || node.includes(pServPrefix)) {
				return false; // ignore home or purchased server
			}
			return canPenetrate(node);
		});
		return hackableServers;
	};

	const getOwnedServers = () => {
		const servers = [];
		let i = 0;
		while (ns.serverExists(pServPrefix + i)) {
			servers.push(pServPrefix + i);
			++i;
		}
		return servers;
	};

	const networkNodes = [];
	networkNodes.push(...getCrackableNetworkServers());
	networkNodes.push(...getOwnedServers());

	if (options.includeHome) {
		networkNodes.push(homeServ);
	}

	for (const node of networkNodes) {
		ns.killall(node);
	}
}