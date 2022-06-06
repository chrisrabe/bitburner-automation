// flag -> default value
const supportedFlags = {
	homeRam: null, // preferred used memory on home server
	sortField: 'revYield'
}

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL");

	const flagData = ns.flags(
		Object.keys(supportedFlags).map(key => [key, supportedFlags[key]])
	);

	// ==============================
	//   	    Constants
	// ==============================

	const homeServ = "home";
	const pServPrefix = "pserv-"; // purchased servers
	const hServPrefix = "hacknet"; // hacknet servers

	const attackDelay = 50; // time between attacks (ms)

	const actions = {
		w: 'weaken',
		h: 'hack',
		g: 'grow'
	};

	const viruses = [
		'hack-pirate.js',
		'weaken-pirate.js',
		'grow-pirate.js'
	];

	const virusRam = viruses.reduce((sum, virus) => {
		sum += ns.getScriptRam(virus)
		return sum;
	}, 0) / viruses.length;

	const cracks = {
		"BruteSSH.exe": ns.brutessh,
		"FTPCrack.exe": ns.ftpcrack,
		"relaySMTP.exe": ns.relaysmtp,
		"HTTPWorm.exe": ns.httpworm,
		"SQLInject.exe": ns.sqlinject
	};

	// ==============================
	//   	    Validation
	// ==============================

	if (isNaN(flagData.homeRam)) {
		if (!flagData.homeRam.endsWith('%')) {
			ns.tprint('ERROR Invalid syntax for homeRam value. Must end with percent symbol (e.g. 90%)');
			return;
		}
		// Allow support for percentage (e.g. --homeRam 90%)
		const inputPercent = parseFloat(flagData.homeRam);
		if (0 < inputPercent && inputPercent > 100) {
			ns.tprint('ERROR Invalid value for homeRam. Percent must be between 0 and 100');
			return;
		}
	} else {
		const maxHomeRam = ns.getServerMaxRam(homeServ);
		if (flagData.homeRam > maxHomeRam) {
			ns.tprint(`ERROR Invalid value for homeRam. homeRam must not be greater than ${maxHomeRam}`);
			return;
		}
	}

	if (!['revYield', 'maxMoney'].includes(flagData.sortField)) {
		ns.tprint('ERROR Invalid value for sortField. Supported values revYield | maxMoney');
		return;
	}

	if (!ns.fileExists('Formulas.exe', homeServ)) {
		ns.tprint('ERROR Formulas.exe not found. Unable to use this script.');
		return;
	}

	// ==============================
	//   	   Ship Retrieval
	// ==============================

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

	/**
	 * Uses DFS to retrieve all the nodes within your network
	 */
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

	const createShip = (node, isOwned, freeRam = undefined) => {
		const memLeft = freeRam !== undefined ?
			freeRam
			: ns.getServerMaxRam(node) - ns.getServerUsedRam(node);
		return {
			node,
			isOwned,
			freeRam: memLeft
		}
	};

	const getCrackableNetworkServers = () => {
		const networkNodes = getNetworkNodes();
		const hackableServers = networkNodes.filter(node => {
			if (node == homeServ || node.includes(pServPrefix) || node.includes(hServPrefix)) {
				return false; // ignore home, hacknet or purchased server
			}
			return canPenetrate(node);
		});
		return hackableServers.map(node => createShip(node, false));
	};

	const getOwnedServers = () => {
		const servers = [];
		let i = 0;
		while (ns.serverExists(pServPrefix + i)) {
			servers.push(pServPrefix + i);
			++i;
		}
		return servers.map(node => createShip(node, true));
	};

	const getHomeServerMaxRam = () => {
		if (isNaN(flagData.homeRam)) {
			const inputPercent = parseFloat(flagData.homeRam) / 100;
			return Math.floor(ns.getServerMaxRam(homeServ) * inputPercent);
		} else {
			return Math.floor(ns.getServerMaxRam(homeServ) - flagData.homeRam);
		}
	}

	const getHomeServer = () => {
		if (flagData.homeRam === null) {
			return createShip(homeServ, true, 0);
		}
		const servMaxRam = getHomeServerMaxRam();
		const usedRam = Math.ceil(ns.getServerUsedRam(homeServ));
		if (usedRam >= servMaxRam) {
			return createShip(homeServ, true, 0);
		}
		const freeRam = servMaxRam - usedRam;
		return createShip(homeServ, true, freeRam);
	};

	const getShips = () => {
		const ships = [];
		ships.push(...getCrackableNetworkServers());
		ships.push(...getOwnedServers());
		ships.push(getHomeServer());

		const minReqMem = Math.min(...viruses.map(virus => ns.getScriptRam(virus)));

		return ships.filter(ship => ship.freeRam > minReqMem);
	}

	// ==============================
	//   	  Ship Preparation
	// ==============================

	const penetrate = (server) => {
		ns.print("Penetrating " + server);
		for (var file of Object.keys(cracks)) {
			if (ns.fileExists(file, homeServ)) {
				var runScript = cracks[file];
				runScript(server);
			}
		}
	}

	const getRootAccess = (server) => {
		if (ns.hasRootAccess(server)) {
			return;
		}

		var requiredPorts = ns.getServerNumPortsRequired(server);
		if (requiredPorts > 0) {
			penetrate(server);
		}
		ns.nuke(server);
	}

	const prepareServers = async (servers) => {
		for (const serv of servers) {
			const servName = serv.node;
			await ns.scp(viruses, servName); // copy viruses over
			if (!serv.isOwned) {
				getRootAccess(servName);
			}
		}
	}

	// ==============================
	//    Retrieve network targets
	// ==============================

	function canHack(server) {
		var pHackLvl = ns.getHackingLevel(); // player
		var sHackLvl = ns.getServerRequiredHackingLevel(server);
		return pHackLvl >= sHackLvl;
	}

	const getNodeInfo = (node) => {
		const maxMoney = ns.getServerMaxMoney(node);

		const server = ns.getServer(node);
		const player = ns.getPlayer();
		const hackChance = ns.formulas.hacking.hackChance(server, player);
		const revYield = maxMoney * hackChance;

		return {
			node,
			maxMoney,
			revYield
		}
	};

	const getComparator = (compareField) => {
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

	const getPotentialTargets = () => {
		const networkNodes = getNetworkNodes();
		const hackableServers = networkNodes.filter(node => {
			if (node == homeServ || node.includes(pServPrefix)) {
				return false; // ignore home or purchased server
			}
			return canPenetrate(node) && canHack(node);
		});

		// We need to make sure that all targets have root access
		// so that we can run hack, weaken, grow on them
		for (const serv of hackableServers) {
			if (!ns.hasRootAccess(serv)) {
				getRootAccess(serv);
			}
		}

		// Extracts servers that has money and sorts them
		// into descending order using the sortField option
		return hackableServers
			.map(node => getNodeInfo(node))
			.filter(node => node.maxMoney > 0)
			.sort(getComparator(flagData.sortField));
	};

	// ==============================
	//  Retrieve attack requirements
	// ==============================

	function getStrategy(node) {
		const moneyThresh = ns.getServerMaxMoney(node) * 0.75;
		const secThresh = ns.getServerMinSecurityLevel(node) + 5;
		const result = {
			type: '', // strategy name (for loggin)
			seq: [], // action sequence
			allocation: [] // recommended allocation
		}
		if (ns.getServerSecurityLevel(node) > secThresh) {
			result.type = 'flog';
			result.seq = ['g', 'w'];
			result.allocation = [0.3, 0.7];
		} else if (ns.getServerMoneyAvailable(node) < moneyThresh) {
			result.type = 'nourish';
			result.seq = ['g', 'w'];
			result.allocation = [0.6, 0.4];
		} else {
			result.type = 'plunder';
			result.seq = ['h', 'w', 'g', 'w'];
			result.allocation = [0.25, 0.25, 0.25, 0.25];
		}
		return result;
	}

	function getDelayForActionSeq(seq, node) {
		const player = ns.getPlayer();
		const server = ns.getServer(node);

		const wTime = ns.formulas.hacking.weakenTime(server, player);
		const gTime = ns.formulas.hacking.growTime(server, player);
		const hTime = ns.formulas.hacking.hackTime(server, player);

		const timing = {
			w: wTime,
			g: gTime,
			h: hTime
		};

		// Define arbitrary values representing when each action will end
		const baseTimes = seq.map((_, i) => i + (attackDelay * i));

		// Define when each action in the sequence will start
		const actionStart = seq.map((action, i) => {
			const execTime = timing[action];
			return baseTimes[i] - execTime;
		});

		// Find the smallest "x" coordinate
		const execStart = Math.min(...actionStart);

		// Calculate distance between the smallest "x" coord
		// and when the action starts to get the delay
		const delays = seq.map((_, i) => {
			return Math.abs(execStart - actionStart[i]);
		});

		return delays;
	}


	function getMaxThreads(node) {
		const moneyThresh = ns.getServerMaxMoney(node) * 0.75;
		const secThresh = ns.getServerMinSecurityLevel(node) + 5;
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
		const weakenEffect = ns.weakenAnalyze(1);
		const secToDecrease = Math.abs(ns.getServerSecurityLevel(node) - secThresh);
		const weakenThreads = weakenEffect > 0 ? Math.round(secToDecrease / weakenEffect) : 0;
		// Hack calculation
		var hackEffect = ns.hackAnalyze(node);
		var hackTaken = hackEffect * curMoney;
		var hackThreads = Math.round(moneyThresh / hackTaken);

		// Make sure that none of the variables are Infinity.
		// Assign them default values if that's the case

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

	const getRequirements = (node) => {
		const strategy = getStrategy(node);
		const delays = getDelayForActionSeq(strategy.seq, node);
		const maxThreads = getMaxThreads(node);
		return {
			delays,
			maxThreads,
			strategy
		}
	}

	// ==============================
	//  	 Creating fleets
	// ==============================

	const getTotalThreads = (servers) => {
		return servers.reduce((sum, node) => {
			const threads = Math.floor(node.freeRam / virusRam);
			sum += threads;
			return sum;
		}, 0);
	}

	const getAllocation = (reqs, ships) => {
		const totalThreads = getTotalThreads(ships);
		const { maxThreads } = reqs;

		const threads = {
			numWeaken: 0,
			numGrow: 0,
			numHack: 0
		};

		if (maxThreads.total < totalThreads) {
			// Our network can support the maximum amount of
			// threads required to execute the strategy sequence.
			threads.numWeaken = maxThreads.weaken;
			threads.numGrow = maxThreads.grow;
			threads.numHack = maxThreads.hack;
		} else {
			// We use the recommended allocation ratio
			// defined by our strategy to divide our network threads
			const { seq, allocation } = reqs.strategy;
			for (let i = 0; i < seq.length; i++) {
				const action = seq[i];
				const portion = allocation[i];
				const numThreads = Math.floor(totalThreads * portion);
				if (action === 'w') {
					threads.numWeaken = numThreads;
				} else if (action === 'g') {
					threads.numGrow = numThreads;
				} else {
					threads.numHack = numThreads;
				}
			}
		}

		return threads;
	};

	const createActionFleet = (action, ships, maxThreads, delay) => {
		const fleet = {
			action,
			ships: []
		};
		const assigned = {};
		let usedThreads = 0;
		for (const ship of ships) {
			if (usedThreads >= maxThreads) {
				break; // max reached, no need to allocate
			}
			const maxExecThreads = Math.floor(ship.freeRam / virusRam);
			const newUsedThreads = usedThreads + maxExecThreads;
			const allocThreads = newUsedThreads > maxThreads ?
				maxThreads - usedThreads : maxExecThreads;
			assigned[ship.node] = allocThreads * virusRam;
			fleet.ships.push({
				node: ship.node,
				threads: allocThreads,
				delay
			});
			usedThreads += allocThreads;
		}
		return { assigned, fleet };
	};

	const getUnassignedShips = (ships, shipLookup, assignedShips) => {
		return ships.map(ship => {
			if (assignedShips[ship.node]) {
				// This would alter the original ships array
				const initialRam = shipLookup[ship.node].freeRam;
				ship.freeRam = initialRam - assignedShips[ship.node];
				return ship;
			}
			return ship;
		}).filter(ship => !assignedShips[ship.node] || ship.freeRam > virusRam);
	}

	const createShipLookup = (ships) => {
		return ships.reduce((acc, ship) => {
			acc[ship.node] = { ...ship };
			return acc;
		}, {});
	}

	const readyFleets = (reqs, contract, ships) => {
		const { strategy: { seq }, delays } = reqs;

		// We sort the ships from largest to smallest memory so that 
		// we use up the servers with the most RAM first
		const sortedShips = ships.sort((a, b) => b.freeRam - a.freeRam);

		// We define a lookup that contains initial details of the
		// ships to determine recalculated RAM
		const shipLookup = createShipLookup(sortedShips);

		// A record that contains the server name mapped to
		// the number of RAM allocated
		const assignedShips = {};

		const fleets = [];

		for (let i = 0; i < seq.length; i++) {
			const actionSym = seq[i];
			const delay = delays[i];
			const action = actions[actionSym];
			const maxThreads = contract[actionSym];
			const unassignedShips = getUnassignedShips(sortedShips, shipLookup, assignedShips);
			const { assigned, fleet } = createActionFleet(action, unassignedShips, maxThreads, delay);
			// Record assigned ships and the memory allocated
			for (const ship of Object.keys(assigned)) {
				if (!assignedShips[ship]) {
					assignedShips[ship] = 0;
				}
				assignedShips[ship] += assigned[ship];
			}
			fleets.push(fleet);
		}

		// This line is here so that it can update the
		// original ships array of their free RAM.
		getUnassignedShips(sortedShips, shipLookup, assignedShips);

		return fleets;
	}

	const createFleets = (reqs, ships) => {
		const { numGrow, numHack, numWeaken } = getAllocation(reqs, ships);
		// specifies how many threads we will allocate per operation
		const contract = {
			w: numWeaken,
			g: numGrow,
			h: numHack
		}
		// Assign fleets based on the contract
		return readyFleets(reqs, contract, ships);
	}

	// ==============================
	//  	 Launching attack
	// ==============================

	const getVirusFromAction = (action) => `${action}-pirate.js`;

	function logShipAction(ship, action, target) {
		let variant = "INFO";
		let icon = "💵";
		if (action === "weaken") {
			variant = "ERROR";
			icon = "☠️";
		} else if (action === "grow") {
			variant = "SUCCESS";
			icon = "🌱";
		}
		ns.print(`${variant}\t ${icon} ${action} @ ${ship.node} (${ship.threads}) -> ${target}`);
	}

	const launchAttack = (target, fleets) => {
		for (const fleet of fleets) {
			const action = fleet.action;
			const virus = getVirusFromAction(action);
			for (const ship of fleet.ships) {
				if (ship.threads < 1) {
					continue; // skip
				}
				const pid = Date.now();
				ns.exec(virus, ship.node, ship.threads, target, ship.delay, pid);
				logShipAction(ship, action, target);
			}
		}
	}

	// ==============================
	//  		Main Logic
	// ==============================

	const tick = 1000;

	while (true) {
		let ships = getShips();
		await prepareServers(ships);

		const targets = getPotentialTargets();
		for (const target of targets) {
			const targetNode = target.node;
			const req = getRequirements(targetNode);
			const fleets = createFleets(req, ships);
			launchAttack(targetNode, fleets);
			ships = ships.filter(ship => ship.freeRam > virusRam);
		}

		await ns.sleep(tick);
	}
}
