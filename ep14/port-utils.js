// 1 - 19 (input ports)
// 20 - output port (used for executions)

export const minInputPort = 1;
export const maxInputPort = 19;

export const outputPort = 20;

function isInputPort(port) {
	return minInputPort <= port && port <= maxInputPort;
}

/** @param {NS} ns **/
export function pushToInputPort(ns, eventType, data, port) {
	if (!isInputPort(port)) {
		ns.tprint(`ERROR\t Input ports must be between ${minInputPort} and ${maxInputPort}!`);
		return;
	}
	const handle = ns.getPortHandle(port);
	const payload = {
		eventType,
		data: JSON.stringify(data)
	};
	handle.write(JSON.stringify(payload));
}

/** @param {NS} ns **/
export function pushToOutputPort(ns, payload) {
	const handle = ns.getPortHandle(outputPort);
	if (handle.full()) {
		return false;
	}
	handle.write(payload);
	return true;
}

/** @param {NS} ns **/
export async function listenForEvent(ns, eventType, callback, tick = 1000) {
	const handle = ns.getPortHandle(outputPort);
	while (true) {
		if (!handle.empty()) {
			const payload = JSON.parse(handle.peek());
			if (payload.eventType === eventType) {
				handle.read(); // remove from queue
				callback(payload.data);
			}
		}
		await ns.sleep(tick);
	}
}
