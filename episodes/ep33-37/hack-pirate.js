/** @param {NS} ns */
export async function main(ns) {
	var target = ns.args[0];
	var delay = ns.args[1];
	var pid = ns.args[2];

	ns.print(pid);
	await ns.sleep(delay);
	await ns.hack(target);
}
