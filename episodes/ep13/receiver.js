/** @param {NS} ns **/
export async function main(ns) {
	const tickDuration = ns.args[0];
	const port = ns.args[1];

	const minPortRange = 1;
	const maxPortRange = 20;

	if (port < minPortRange || port > maxPortRange) {
		ns.tprint("Port number must be between 1 and 20");
		return;
	}

	function process(msg) {
		const data = JSON.parse(msg);
		ns.tprint("Received packet " + data.id);
	}

	const portHandle = ns.getPortHandle(port);

	while (true) {
		if (!portHandle.empty()) {
			const msg = portHandle.read();
			process(msg);
		}
		await ns.sleep(tickDuration);
	}
}