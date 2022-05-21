/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	const tickDuration = ns.args[0];
	const port = ns.args[1];

	const minPortRange = 1;
	const maxPortRange = 20;

	if (port < minPortRange || port > maxPortRange) {
		ns.tprint("Port number must be between 1 and 20");
		return;
	}

	function pushDataToPort(data, handle) {
		if (handle.full()) {
			ns.tprint("ERROR\tUnable to push data. Port is full!");
			return;
		}

		const dataStr = JSON.stringify(data);
		ns.tprint("INFO\tPUSHED data to port: " + dataStr);
		handle.write(dataStr);
	}

	const portHandle = ns.getPortHandle(port);

	if (!portHandle.empty()) {
		ns.tprint("ERROR\t Port still has things in it!!");
	}

	ns.atExit(() => {
		portHandle.clear();
	});

	let i = 0;
	while (true) {
		const data = {
			id: i
		};
		pushDataToPort(data, portHandle);
		if (portHandle.full()) {
			ns.tprint("MAX QUEUE SIZE: " + i);
		}
		i++;
		await ns.sleep(tickDuration);
	}
}