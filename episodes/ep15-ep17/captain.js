import { pushToInputPort, checkForEvent, createUUID } from "./port-utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	// Type of data we can request from our services
	const dataType = {
		ships: "Ships",
		targets: "Targets",
		attack: 'Attack'
	}

	// Services that need to be running before the captain
	// If undefined, no need to pass arguments
	// Each service needs a port number and a delay to use as args
	const dependencies = {
		'watchtower.js': undefined,
		'queue-service.js': undefined,
		'diamond-hands.js': undefined,
		'strategist.js': {
			port: 1,
			delay: 50
		},
		'book-keeper.js': {
			port: 2,
			delay: 50
		},
		'warmonger.js': {
			port: 3,
			delay: 50
		}
	}

	// Captain fields
	const captainPort = 19;
	const maxTicks = 5;
	const reqDuration = 250;
	const homeServ = "home";
	const uuid = createUUID();

	var actions = {
		w: 'weaken',
		h: 'hack',
		g: 'grow'
	};

	var virus = "pirate.js";
	var virusRam = ns.getScriptRam(virus);

	async function requestData(type, payload = {}) {
		const reqEvent = `req${type}`;
		const resEvent = `res${type}`;
		pushToInputPort(ns, reqEvent, uuid, payload, captainPort);
		let curTicks = 0;
		while (true) {
			if (curTicks > maxTicks) {
				ns.print("ERROR Request time out for " + type);
				return;
			}
			const event = checkForEvent(ns, resEvent, uuid);
			if (event) {
				return event.data;
			}
			curTicks++;
			await ns.sleep(reqDuration);
		}
	}

	function runDependencies() {
		for (const service of Object.keys(dependencies)) {
			const args = dependencies[service];
			if (!ns.scriptRunning(service, homeServ)) {
				if (args) {
					ns.run(service, 1, args.port, args.delay);
				} else {
					ns.run(service, 1);
				}
			}
		}
	}

	function getTotalThreads(servers) {
		return Object.values(servers).reduce((sum, nodeRam) => {
			var threads = Math.floor(nodeRam / virusRam);
			sum += threads;
			return sum;
		}, 0);
	}

	function getAllocation(reqs, ships) {
		var totalThreads = getTotalThreads(ships);
		var {
			maxThreads,
			strategy
		} = reqs;
		var numWeaken = 0;
		var numGrow = 0;
		var numHack = 0;
		if (maxThreads.total < totalThreads) {
			numWeaken = maxThreads.weaken;
			numGrow = maxThreads.grow;
			numHack = maxThreads.hack;
		} else {
			var { seq, allocation } = strategy;
			for (var i = 0; i < seq.length; i++) {
				var action = seq[i];
				var portion = allocation[i];
				if (action === 'w') {
					numWeaken = Math.floor(totalThreads * portion);
				} else if (action === 'g') {
					numGrow = Math.floor(totalThreads * portion);
				} else {
					numHack = Math.floor(totalThreads * portion);
				}
			}
		}
		return {
			numWeaken,
			numGrow,
			numHack
		};
	}

	function readyFleets(reqs, contract, ships) {
		var { strategy, delays } = reqs;
		var { seq } = strategy;
		// allocates tasks to servers with the largest ram first
		var sortedShips = Object.keys(ships).sort((a, b) => ships[b] - ships[a]);
		var assigned = {};
		var fleets = [];
		for (var i = 0; i < seq.length; i++) {
			var delay = delays[i];
			var sym = seq[i]; // symbol
			var action = actions[sym];
			var maxThreads = contract[sym];
			var fleet = {
				action,
				ships: []
			}
			var usedThreads = 0;
			for (var serv of sortedShips) {
				if (usedThreads >= maxThreads) {
					break;
				}
				if (assigned[serv]) {
					continue; // skip assigned
				}
				var ram = ships[serv];
				var maxExecThreads = Math.floor(ram / virusRam);
				var newUsedThreads = usedThreads + maxExecThreads;
				var threads = maxExecThreads;
				if (newUsedThreads > maxThreads) {
					threads = maxThreads - usedThreads; // only use subset
				}
				usedThreads += threads;
				assigned[serv] = {
					used: threads,
					left: maxExecThreads - threads
				};

				fleet.ships.push({
					serv,
					threads,
					delay
				});
			}
			fleets.push(fleet);
		}
		return {
			fleets,
			assigned
		};
	}

	// Create a fleet of servers that can be launched to target
	function createFleets(reqs, ships) {
		var { numWeaken, numGrow, numHack } = getAllocation(reqs, ships);
		// specifies how many threads we will allocate per operation
		var contract = {
			w: numWeaken,
			g: numGrow,
			h: numHack
		};
		// Assign fleets based on the contract
		return readyFleets(reqs, contract, ships);
	}

	async function launchAttack(target, fleets) {
		const res = await requestData(dataType.attack, { target, fleets });
		if (res) {
			ns.print("SUCCESS\tAttacking " + target);
		} else {
			ns.print("ERROR\tFailed to attack " + target);
		}
	}

	runDependencies();

	const tick = 1000;

	while (true) {
		const ships = await requestData(dataType.ships);
		if (!ships || Object.keys(ships).length === 0) {
			await ns.sleep(tick);
			continue;
		}
		const targets = await requestData(dataType.targets);
		if (!targets) {
			continue;
		}
		for (const target of targets) {
			if (Object.keys(ships).length === 0) {
				break; // no ships available
			}
			const targetNode = target.node;
			const reqs = target.reqs;
			var { fleets, assigned } = createFleets(reqs, ships);
			await launchAttack(targetNode, fleets);
			// Delete assigned from list of fleets
			for (var ship of Object.keys(assigned)) {
				var usage = assigned[ship];
				if (usage.left <= 1) { // useless if only 1 thread left
					delete ships[ship];
				} else {
					ships[ship] = usage.left;
				}
			}
			// Early exit if no more ships to assign
			if (Object.keys(ships).length <= 0) {
				break;
			}
		}
		await ns.sleep(tick);
	}
}