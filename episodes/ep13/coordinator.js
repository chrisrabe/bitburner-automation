/** @param {NS} ns **/
export async function main(ns) {
	const port = 1;
	const tickDuration = 1000;

	const sender = "sender.js";
	const receiver = "receiver.js";

	ns.run(sender, 1, tickDuration, port);
	ns.run(receiver, 1, tickDuration, port);
}