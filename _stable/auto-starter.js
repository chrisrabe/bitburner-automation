import { pushToInputPort, checkForEvent, createUUID } from "./port-utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");
	// Port fields
	const uuid = createUUID();
	const reqDuration = 250;
	const maxTicks = 5;
	const port = 18;

	// Auto starter fields
	const autoDeployScript = "auto-deploy.js";
	const autoPurchaseServerScript = "auto-purchase-server.js";
	const apsLiteScript = "aps-lite.js"
	const launchFleetsScript = "launch-fleets.js";
	const homeServ = "home";
	const tick = 10000; // 10s
	let curTarget = "n00dles";

	const dataType = {
		targets: "Targets",
	}

	// Services that need to be running before the captain
	// If undefined, no need to pass arguments
	// Each service needs a port number and a delay to use as args
	const dependencies = {
		'queue-service.js': undefined,
		'strategist.js': {
			port: 1,
			delay: 50
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

	function killDependencies() {
		for (const service of Object.keys(dependencies)) {
			if (ns.scriptRunning(service, homeServ)) {
				ns.scriptKill(service, homeServ);
			}
		}
	}

	async function requestData(type, payload = {}) {
		const reqEvent = `req${type}`;
		const resEvent = `res${type}`;
		pushToInputPort(ns, reqEvent, uuid, payload, port);
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

	function launchFleetsAndExit() {
		ns.tprint(`WARN Formulas.exe purchased! Swapping to launch-fleets!`);
		killDependencies();
		ns.scriptKill(autoDeployScript, homeServ);
		ns.scriptKill(autoPurchaseServerScript, homeServ);
		ns.exec(launchFleetsScript, homeServ);
		ns.exec(apsLiteScript, homeServ);
		ns.exit();
	}

	async function updateTargetIfApplicable() {
		const targets = await requestData(dataType.targets);
		const newTarget = targets[0].node;
		if (newTarget != curTarget) {
			ns.print(`WARN Swapping targets: ${curTarget} -> ${newTarget}`);
			ns.scriptKill(autoDeployScript, homeServ);
			ns.scriptKill(autoPurchaseServerScript, homeServ);
			ns.exec(autoDeployScript, homeServ, 1, newTarget);
			ns.exec(autoPurchaseServerScript, homeServ, 1, newTarget);
			curTarget = newTarget;
		}
	}

	runDependencies();

	while (true) {
		if (ns.fileExists("Formulas.exe", homeServ)) {
			launchFleetsAndExit();
		} else {
			await updateTargetIfApplicable();
		}
		await ns.sleep(tick);
	}
}