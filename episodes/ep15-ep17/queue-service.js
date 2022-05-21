import {
	pushToOutputPort,
	minInputPort,
	maxInputPort,
	outputPort
} from "./port-utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	const queue = [];
	const tick = 25;
	const maxPerPort = 50; // limit on how much we collect so it doesn't freeze game

	let totalCollected = 0;
	let dumped = 0;

	// Ideally, I wanted to run input port listeners in the background through
	// intervals, but it looks like we can't use that :(
	function getDataFromInputPorts() {
		for (let port = minInputPort; port <= maxInputPort; port++) {
			const handle = ns.getPortHandle(port);
			let collected = 0;
			while (!handle.empty() && collected < maxPerPort) {
				queue.push(handle.read());
				collected++;
				totalCollected++;
			}
		}
	}

	function dumpQueueToOutputPort() {
		while (queue.length > 0) {
			const next = queue[0];
			if (pushToOutputPort(ns, next)) {
				queue.shift(); // remove from queue
				dumped++;
			} else {
				break; // output queue full
			}
		}
	}

	const outputHandle = ns.getPortHandle(outputPort);

	if (!outputHandle.empty()) {
		ns.tprint(`WARN Items are still in output handle. Clearing automatically.`);
		outputHandle.clear();
	}

	ns.atExit(() => {
		outputHandle.clear();
	});

	while (true) {
		getDataFromInputPorts();
		dumpQueueToOutputPort();

		ns.print("Number of items collected: " + totalCollected);
		ns.print("Number of items dumped: " + dumped);
		ns.print("Items in queue: " + queue.length);
		ns.print("");

		totalCollected = 0;
		dumped = 0;

		await ns.sleep(tick);
	}
}