import {
	getNetworkNodes,
	canHack,
	getThresholds,
	getRootAccess,
	canPenetrate
} from "./utils.js";
import { pushToInputPort, checkForEvent } from "./port-utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	const port = ns.args[0];
	const delay = ns.args[1];

	const player = ns.getPlayer();
	const hasFormulas = ns.fileExists("Formulas.exe", "home");
	const compareField = hasFormulas ? "revYield" : "maxMoney";
	const attackDelay = 50; // 50ms

	const reqEvent = "reqTargets"; // request event
	const resEvent = "resTargets"; // response event

	const cracks = {
		"BruteSSH.exe": ns.brutessh,
		"FTPCrack.exe": ns.ftpcrack,
		"relaySMTP.exe": ns.relaysmtp,
		"HTTPWorm.exe": ns.httpworm,
		"SQLInject.exe": ns.sqlinject
	};

	function getDelayForActionSeq(seq, node) {
		var server = ns.getServer(node);
		var wTime = ns.formulas.hacking.weakenTime(server, player);
		var gTime = ns.formulas.hacking.growTime(server, player);
		var hTime = ns.formulas.hacking.hackTime(server, player);
		var timing = {
			w: wTime,
			g: gTime,
			h: hTime
		};
		const baseTimes = seq.map((_, i) => i + (attackDelay * i));
		const actionStart = seq.map((action, i) => {
			const execTime = timing[action];
			return baseTimes[i] - execTime;
		});
		const execStart = Math.min(...actionStart);
		const delays = seq.map((_, i) => {
			return Math.abs(execStart - actionStart[i]);
		});
		return delays;
	}

	function getMaxThreads(node) {
		var { moneyThresh, secThresh } = getThresholds(ns, node);
		var curMoney = ns.getServerMoneyAvailable(node);
		// Grow calculation
		var growThreads = 0;
		if (curMoney < 1) {
			// no money, assign a single thread to put some cash into it
			growThreads = 1;
		} else {
			var growMul = moneyThresh / curMoney;
			if (growMul >= 1) {
				growThreads = Math.round(ns.growthAnalyze(node, growMul));
			}
		}
		// Weaken calculation
		var weakenEffect = ns.weakenAnalyze(1);
		var weakenThreads = weakenEffect > 0 ? Math.round(secThresh / weakenEffect) : 0;
		// Hack calculation
		var hackEffect = ns.hackAnalyze(node);
		var hackTaken = hackEffect * curMoney;
		var hackThreads = Math.round(moneyThresh / hackTaken);

		// Guards (there's a bug with hackAnalyze I think)
		if (hackThreads === Infinity) {
			hackThreads = 0;
		}
		if (weakenThreads === Infinity) {
			weakenThreads = 0;
		}
		if (growThreads === Infinity) {
			growThreads = 1;
		}

		return {
			grow: growThreads,
			weaken: weakenThreads,
			hack: hackThreads,
			total: growThreads + weakenThreads + hackThreads
		};
	}

	// Strategy for thread allocation
	function getStrategy(node) {
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

	function getRequirements(node) {
		var strategy = getStrategy(node);
		var delays = getDelayForActionSeq(strategy.seq, node);
		var maxThreads = getMaxThreads(node);
		return {
			delays,
			maxThreads,
			strategy
		};
	}

	function getNodeInfo(node) {
		const server = ns.getServer(node);

		const maxMoney = ns.getServerMaxMoney(node);

		let revYield = undefined;
		let reqs = undefined;

		if (hasFormulas) {
			const hackChance = ns.formulas.hacking.hackChance(server, player);
			revYield = maxMoney * hackChance;
			reqs = getRequirements(node);
		}

		const nodeDetails = {
			node,
			maxMoney,
			revYield,
			reqs
		};

		return nodeDetails;
	}

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

	function getPotentialTargets() {
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
		var nodeDetails = hackableNodes.map(node => getNodeInfo(node));
		var nodesDesc = nodeDetails
			.filter(node => node.maxMoney > 0)
			.sort(getComparator(compareField));
		return nodesDesc;
	}

	async function respondToRequest(reqId) {
		const targets = await getPotentialTargets();
		pushToInputPort(ns, resEvent, reqId, targets, port);
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