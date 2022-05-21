// 1 - 19 (input ports)
// 20 - output port (used for executions)

export const minInputPort = 1;
export const maxInputPort = 19;

export const outputPort = 20;

function isInputPort(port) {
	return minInputPort <= port && port <= maxInputPort;
}

/** @param {NS} ns **/
export function pushToInputPort(ns, eventType, reqId, data, port) {
	if (!isInputPort(port)) {
		ns.tprint(`ERROR\t Input ports must be between ${minInputPort} and ${maxInputPort}!`);
		return;
	}
	const handle = ns.getPortHandle(port);
	const payload = {
		eventType,
		reqId, // used for identifying origin of request
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
export function checkForEvent(ns, eventType, reqId = "ANY") {
	const handle = ns.getPortHandle(outputPort);
	if (!handle.empty()) {
		const payload = JSON.parse(handle.peek());
		if (payload.eventType === eventType) {
			if (reqId !== "ANY" && reqId !== payload.reqId) {
				return undefined;
			}
			handle.read(); // remove from queue
			return {
				data: JSON.parse(payload.data),
				reqId: payload.reqId
			};
		}
	}
	return undefined;
}

// I actually don't know how this function works in the technical sense
// Look at https://www.w3resource.com/javascript-exercises/javascript-math-exercise-23.php
export function createUUID() {
	var dt = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = (dt + Math.random() * 16) % 16 | 0;
		dt = Math.floor(dt / 16);
		return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
	return uuid;
}