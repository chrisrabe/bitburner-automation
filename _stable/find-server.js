/** @param {NS} ns **/
export async function main(ns) {
	var target = ns.args[0];
	var origin = ns.getHostname();

	// patterns that indicates whether we ignore them
	var ignored = [
		"pserv"
	]

	function hasIgnoredString(text) {
		return ignored.some(function (str) { return text.includes(str) });
	}

	// Use DFS to find visit all nodes in the network until we find
	// the target server
	function getNetworkNodePairs() {
		var visited = {};
		var stack = [];
		stack.push(origin);
		var nodePairs = [];

		while (stack.length > 0) {
			var node = stack.pop();
			if (!visited[node]) {
				if (node === target) {
					break;
				}
				visited[node] = node;
				var neighbours = ns.scan(node);
				for (var i = 0; i < neighbours.length; i++) {
					var child = neighbours[i];
					if (hasIgnoredString(child) || visited[child]) {
						continue;
					}
					stack.push(child);
					var pair = {
						parent: node,
						current: child
					}
					nodePairs.push(pair);
				}
			}
		}
		return nodePairs;
	}

	function reconstructPath(nodes) {
		// for every node, map them to parent
		var parentMap = nodes.reduce(function (acc, node) {
			acc[node.current] = node.parent;
			return acc;
		}, {});

		ns.print("Target found. Recreating path");
		ns.print("Number of nodes tracked: " + nodes.length);
		var path = [];
		var curNode = target;
		while (curNode !== origin) {
			path.push(curNode);
			ns.print("Adding server to path: " + curNode);
			var parent = parentMap[curNode];
			if (!parent) {
				break;
			}
			curNode = parent;
		}

		return path.reverse();
	}

	var nodes = getNetworkNodePairs();
	var path = reconstructPath(nodes);
	const printedStr = path.map(node => `connect ${node}`).join(';');
	ns.tprint(printedStr);
}