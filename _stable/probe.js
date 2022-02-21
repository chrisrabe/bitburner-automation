import { pushToInputPort, checkForEvent, createUUID } from "./port-utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	const port = ns.args[0];
	const reqEvent = ns.args[1]; // request event
	const resEvent = ns.args[2]; // response event

	const maxTicks = 5;
	const tickDuration = 1000;
	const uuid = createUUID();

	async function getPayload() {
		let curTicks = 0;
		while (true) {
			if (curTicks > maxTicks) {
				ns.tprint("ERROR Request time out");
				return;
			}
			const data = checkForEvent(ns, resEvent, uuid);
			if (data) {
				return data;
			}
			curTicks++;
			await ns.sleep(tickDuration);
		}
	}

	ns.tprint("Sending probe using: " + uuid);
	pushToInputPort(ns, reqEvent, uuid, {}, port);

	const payload = await getPayload();

	if (!payload) {
		ns.tprint("ERROR No data returned.");
	} else {
		ns.tprint(payload);
	}
}